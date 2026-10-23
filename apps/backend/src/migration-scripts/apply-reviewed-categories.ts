import * as fs from "fs";
import * as path from "path";
import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import {
  createProductCategoriesWorkflow,
  updateProductsWorkflow,
} from "@medusajs/medusa/core-flows";

// Applies the category corrections from an external review of translation-review.xlsx
// (Ahmed had a separate AI session audit it - verified against the live DB first: 3/3
// spot-checked claims confirmed real errors, e.g. a strapping product's stored width was
// "70mm" when the title says 16mm x 0.70mm thickness). Reconciles against the CURRENT live
// category on every product before moving it - several of these (Köşebent, Masura, Palet)
// were already fixed earlier this session and must be no-ops here, not reverted.
const AMBALAJ_MALZEMELERI_ID = "pcat_01M3FP3059WQXVGXZ8FB0EZN63";

const NEW_CATEGORIES: Record<string, { en: string; bg: string; ar: string }> = {
  "Çemberleme Ekipmanları": { en: "Strapping Equipment", bg: "Оборудване за чембероване", ar: "معدات التربيط" },
  "PET Çember": { en: "PET Strapping", bg: "Полиестерна лента за чембероване (PET)", ar: "شريط تربيط بوليستر (PET)" },
  "Çift Taraflı Bant": { en: "Double-Sided Tape", bg: "Двустранна лепяща лента", ar: "شريط لاصق مزدوج الوجه" },
  "Kağıt Bant": { en: "Paper Tape", bg: "Хартиена лепяща лента", ar: "شريط لاصق ورقي" },
  "Kompozit Lifli Çember": { en: "Composite Cord Strapping", bg: "Композитна лента за чембероване, подсилена с влакна", ar: "شريط تربيط مركّب مدعّم بالألياف" },
  "EPS Levha": { en: "EPS Boards", bg: "Плочи от експандиран полистирен (EPS)", ar: "ألواح بوليسترين ممدد (فلين)" },
};

type Reassignment = { handle: string; to: string };

export default async function apply_reviewed_categories({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const reassignments: Reassignment[] = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, "../../../../category_reassignments.json"), "utf8")
  );

  const { data: existingCats } = await query.graph({
    entity: "product_category",
    fields: ["id", "name", "parent_category_id"],
  });
  const byName = new Map((existingCats as any[]).map((c) => [c.name, c]));

  const neededNames = [...new Set(reassignments.map((r) => r.to))];
  const toCreate = neededNames.filter((n) => NEW_CATEGORIES[n] && !byName.has(n));
  if (toCreate.length) {
    const siblingCount = (existingCats as any[]).filter(
      (c) => c.parent_category_id === AMBALAJ_MALZEMELERI_ID
    ).length;
    const { result: created } = await createProductCategoriesWorkflow(container).run({
      input: {
        product_categories: toCreate.map((name, i) => ({
          name,
          parent_category_id: AMBALAJ_MALZEMELERI_ID,
          rank: siblingCount + i,
          is_active: true,
        })),
      },
    });
    for (const c of created as any[]) byName.set(c.name, c);
    logger.info(`Created categories: ${toCreate.join(", ")}`);
  }

  const missingTargets = neededNames.filter((n) => !byName.has(n));
  if (missingTargets.length) {
    logger.info(`WARNING - unknown category targets (not in NEW_CATEGORIES, skipping their products): ${missingTargets.join(", ")}`);
  }

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "title", "handle", "categories.id", "categories.name"],
    filters: { handle: reassignments.map((r) => r.handle) },
  });
  const byHandle = new Map((products as any[]).map((p) => [p.handle, p]));

  let moved = 0, alreadyCorrect = 0, missingProduct = 0, skippedUnknownTarget = 0;

  for (const r of reassignments) {
    const product = byHandle.get(r.handle);
    if (!product) {
      logger.info(`WARNING - product not found for handle: ${r.handle}`);
      missingProduct++;
      continue;
    }
    const target = byName.get(r.to);
    if (!target) {
      skippedUnknownTarget++;
      continue;
    }
    const currentNames = (product.categories || []).map((c: any) => c.name);
    if (currentNames.includes(r.to)) {
      alreadyCorrect++;
      continue;
    }
    await updateProductsWorkflow(container).run({
      input: {
        selector: { id: product.id },
        update: { category_ids: [target.id] },
      },
    });
    moved++;
  }

  logger.info(
    `Category reassignment: moved ${moved}, already correct ${alreadyCorrect}, ` +
      `missing product ${missingProduct}, skipped (unknown target category) ${skippedUnknownTarget}.`
  );
}
