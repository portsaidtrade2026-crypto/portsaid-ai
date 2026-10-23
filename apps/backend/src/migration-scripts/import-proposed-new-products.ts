import * as fs from "fs";
import * as path from "path";
import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys, ProductStatus } from "@medusajs/framework/utils";
import {
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  uploadFilesWorkflow,
} from "@medusajs/medusa/core-flows";

// 5 market-reference product proposals from the external review (not proof of Portsaid
// inventory - no price/stock/brand claimed, AI-generated illustrative images only). Created
// as DRAFT so they never appear on the public storefront until Ahmed confirms a real
// supplier variant, price and stock and flips them to published himself.
const IMAGES_DIR = path.resolve(__dirname, "../../../../new-proposed-products-images");
const AMBALAJ_MALZEMELERI_ID = "pcat_01M3FP3059WQXVGXZ8FB0EZN63";
const KARTON_KUTU_VE_KAGIT_CANTALAR_ID = "pcat_01M3FP0Q6TF35RYNETWNHPT7RY";

const NEW_CATEGORY_IDS: Record<string, string> = {
  "Karton Kutu ve Kağıt Çantalar": KARTON_KUTU_VE_KAGIT_CANTALAR_ID,
};
const CATEGORIES_TO_CREATE = ["Solvent Bant", "Çelik Çember", "Çöp Torbaları"];

type Item = {
  sku: string;
  handle: string;
  category_target: string;
  title_tr: string;
  title_en: string;
  title_bg: string;
  title_ar: string;
  desc_tr: string;
  desc_en: string;
  desc_bg: string;
  desc_ar: string;
  image_file: string;
};

export default async function import_proposed_new_products({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const items: Item[] = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, "../../../../new_proposed_products.json"), "utf8")
  );

  const { data: existingCats } = await query.graph({
    entity: "product_category",
    fields: ["id", "name"],
  });
  for (const c of existingCats as any[]) {
    if (!NEW_CATEGORY_IDS[c.name]) NEW_CATEGORY_IDS[c.name] = c.id;
  }

  const toCreate = CATEGORIES_TO_CREATE.filter((n) => !NEW_CATEGORY_IDS[n] || !(existingCats as any[]).some((c) => c.name === n));
  const stillMissing = CATEGORIES_TO_CREATE.filter((n) => !(existingCats as any[]).some((c) => c.name === n));
  if (stillMissing.length) {
    const siblingCount = (existingCats as any[]).length;
    const { result: created } = await createProductCategoriesWorkflow(container).run({
      input: {
        product_categories: stillMissing.map((name, i) => ({
          name,
          parent_category_id: AMBALAJ_MALZEMELERI_ID,
          rank: siblingCount + i,
          is_active: true,
        })),
      },
    });
    for (const c of created as any[]) NEW_CATEGORY_IDS[c.name] = c.id;
    logger.info(`Created categories: ${stillMissing.join(", ")}`);
  }

  const { data: existingProducts } = await query.graph({
    entity: "product",
    fields: ["id", "handle"],
    filters: { handle: items.map((i) => i.handle) },
  });
  const existingHandles = new Set((existingProducts as any[]).map((p) => p.handle));

  let created = 0, skipped = 0, failed = 0;

  for (const item of items) {
    if (existingHandles.has(item.handle)) {
      skipped++;
      continue;
    }
    const categoryId = NEW_CATEGORY_IDS[item.category_target];
    if (!categoryId) {
      logger.info(`FAILED ${item.sku}: unknown category "${item.category_target}"`);
      failed++;
      continue;
    }
    try {
      const localPath = path.join(IMAGES_DIR, item.image_file);
      const buffer = fs.readFileSync(localPath);
      const { result: uploaded } = await uploadFilesWorkflow(container).run({
        input: {
          files: [
            {
              filename: item.image_file,
              mimeType: "image/png",
              content: buffer.toString("base64"),
              access: "public",
            },
          ],
        },
      });
      const imageUrl = uploaded[0]?.url;
      if (!imageUrl) throw new Error("upload returned no url");

      await createProductsWorkflow(container).run({
        input: {
          products: [
            {
              title: item.title_tr,
              handle: item.handle,
              category_ids: [categoryId],
              status: ProductStatus.DRAFT,
              description: item.desc_tr,
              images: [{ url: imageUrl }],
              thumbnail: imageUrl,
              metadata: {
                translations: {
                  en: { description: item.desc_en },
                  bg: { description: item.desc_bg },
                  ar: { description: item.desc_ar },
                },
              },
              options: [
                { title: "Default option", values: ["Default option value"] },
              ],
              variants: [
                {
                  title: item.title_tr,
                  sku: item.sku,
                  options: { "Default option": "Default option value" },
                  manage_inventory: false,
                },
              ],
            },
          ],
        },
      });
      created++;
    } catch (e: any) {
      failed++;
      logger.info(`FAILED ${item.sku} (${item.title_tr}): ${String(e?.message || e)}`);
    }
  }

  logger.info(`Proposed new products: created ${created} (as DRAFT), skipped ${skipped}, failed ${failed}.`);
}
