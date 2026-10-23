import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import {
  createProductCategoriesWorkflow,
  deleteProductCategoriesWorkflow,
  updateProductCategoriesWorkflow,
} from "@medusajs/medusa/core-flows";

// Ahmed's menu request: group the packaging categories as
//   Streç Film > Endüstriyel / Jumbo / Pre- / Gıda
//   Çember     > PP / PET / Kompozit Lifli / Çemberleme Ekipmanları
//   Bant       > Hotmelt / Akrilik / Maskeleme / Kağıt / Çift Taraflı
// and: he stocks no paper bags, so "Karton Kutu ve Kağıt Çantalar" becomes
// "Karton Kutu"; PE Köpük has no products so it is deleted.
// Dry run by default; set APPLY=1 to change data.
const PARENT = "Ambalaj Malzemeleri";
const GROUPS: Record<string, string[]> = {
  "Streç Film": [
    "Endüstriyel Streç Film",
    "Jumbo Streç Film",
    "Pre-Streç Film",
    "Gıda Streç Film",
  ],
  Çember: [
    "PP Çember",
    "PET Çember",
    "Kompozit Lifli Çember",
    "Çemberleme Ekipmanları",
  ],
  Bant: [
    "Hotmelt Koli Bandı",
    "Akrilik Koli Bandı",
    "Maskeleme Bandı",
    "Kağıt Bant",
    "Çift Taraflı Bant",
  ],
};
const OLD_BOX_NAME = "Karton Kutu ve Kağıt Çantalar";
const NEW_BOX = {
  name: "Karton Kutu",
  handle: "karton-kutu",
  description:
    "Standart ve özel ölçülerde oluklu mukavva kutular, e-ticaret ve toptan sevkiyat için hazır.",
  translations: {
    en: "Corrugated cardboard boxes in standard and custom sizes, ready for e-commerce and wholesale shipping.",
    bg: "Гофрирани картонени кутии в стандартни и по поръчка размери, готови за онлайн търговия и едро изпращане.",
    ar: "كراتين مقوّاة بمقاسات قياسية أو حسب الطلب، جاهزة للشحن التجاري والبيع بالجملة.",
  },
};
const DELETE_NAME = "PE Köpük";

export default async function restructure_packaging_categories({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const apply = process.env.APPLY === "1";
  const nfc = (s: string) => s.normalize("NFC");

  const load = async () =>
    (
      (
        await query.graph({
          entity: "product_category",
          fields: ["id", "name", "handle", "parent_category_id", "description", "metadata", "products.id"],
        })
      ).data as any[]
    ).map((c) => ({ ...c, name: nfc(c.name) }));
  let cats = await load();
  const byName = (n: string) => cats.find((c) => c.name === nfc(n));

  const parent = byName(PARENT);
  if (!parent) throw new Error(`Parent ${PARENT} not found`);

  // sanity: every child must exist before anything is changed
  for (const [group, children] of Object.entries(GROUPS)) {
    for (const child of children) {
      const c = byName(child);
      if (!c) throw new Error(`Missing category ${child}`);
      if (c.parent_category_id !== parent.id && !byName(group))
        throw new Error(`${child} is not under ${PARENT}`);
    }
  }
  const box = byName(OLD_BOX_NAME) ?? byName(NEW_BOX.name);
  const pe = byName(DELETE_NAME);
  logger.info(`box category: ${box ? box.name : "MISSING"}; metadata=${JSON.stringify(box?.metadata)?.slice(0, 300)}`);
  if (pe && pe.products.length) throw new Error("PE Köpük has products - aborting");
  logger.info(`${pe ? "will delete" : "already gone:"} ${DELETE_NAME}`);

  if (!apply) {
    for (const [group, children] of Object.entries(GROUPS)) {
      logger.info(`${byName(group) ? "exists" : "will create"} group ${group} <- ${children.join(", ")}`);
    }
    logger.info("DRY RUN: no changes made");
    return;
  }

  // 1. groups
  const missing = Object.keys(GROUPS).filter((g) => !byName(g));
  if (missing.length) {
    await createProductCategoriesWorkflow(container).run({
      input: {
        product_categories: missing.map((name, i) => ({
          name,
          is_active: true,
          parent_category_id: parent.id,
          rank: i,
        })),
      },
    });
    logger.info(`Created groups: ${missing.join(", ")}`);
    cats = await load();
  }

  // 2. move children under their group
  for (const [group, children] of Object.entries(GROUPS)) {
    const g = byName(group)!;
    for (const child of children) {
      const c = byName(child)!;
      if (c.parent_category_id === g.id) continue;
      await updateProductCategoriesWorkflow(container).run({
        input: { selector: { id: c.id }, update: { parent_category_id: g.id } },
      });
      logger.info(`Moved ${child} -> ${group}`);
    }
  }

  // 3. rename the box category and drop the bags from its copy
  if (box && box.name !== nfc(NEW_BOX.name)) {
    const translations = { ...(box.metadata?.translations ?? {}) };
    for (const [loc, description] of Object.entries(NEW_BOX.translations)) {
      translations[loc] = { ...(translations[loc] ?? {}), description };
    }
    await updateProductCategoriesWorkflow(container).run({
      input: {
        selector: { id: box.id },
        update: {
          name: NEW_BOX.name,
          handle: NEW_BOX.handle,
          description: NEW_BOX.description,
          metadata: { ...(box.metadata ?? {}), translations },
        },
      },
    });
    logger.info(`Renamed "${OLD_BOX_NAME}" -> "${NEW_BOX.name}"`);
  }

  // 4. delete the empty PE Köpük category
  if (pe) {
    await deleteProductCategoriesWorkflow(container).run({ input: [pe.id] });
    logger.info(`Deleted ${DELETE_NAME}`);
  }
}
