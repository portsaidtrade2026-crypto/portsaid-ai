import * as fs from "fs";
import * as path from "path";
import { MedusaContainer } from "@medusajs/framework";
import {
  ContainerRegistrationKeys,
  ProductStatus,
} from "@medusajs/framework/utils";
import {
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  deleteProductsWorkflow,
  uploadFilesWorkflow,
} from "@medusajs/medusa/core-flows";

// One-shot import of 72 furniture products supplied by Ahmed as a
// ChatGPT/Codex-prepared package (products-no-prices.json + images/),
// sitting alongside this script in furniture-import-assets/. Source is a
// supplier price list; prices/bank info/logo were deliberately stripped
// upstream - every product here is unpriced and created as DRAFT so nothing
// goes live until Ahmed reviews and a real price is set.
//
// Per CLAUDE.md, this app has no per-product title translation mechanism
// (that was tried for categories and reverted for products - it collapsed
// distinct titles). So `title` is the raw Turkish title (kept with its
// "— 0NN" suffix since many products share an otherwise-identical generic
// name, same convention as the existing stretch-film catalog). The other
// three locale titles/specs from the package are preserved in
// metadata.translations for whenever per-product translation exists.
const ASSETS_DIR = path.resolve(__dirname, "furniture-import-assets");
const PRODUCTS_JSON = path.join(ASSETS_DIR, "products-no-prices.json");

// Ahmed's call (2026-10-02): most of this package is genuine office
// furniture, so it stays in the existing "Ofis Mobilya" category, but a
// handful of items aren't office furniture at all - those get their own
// new categories rather than being misfiled.
const GARDEN_TYPES = new Set(["Bahçe Mobilyası Takımı", "Askılı Salıncak"]);
const DECOR_TYPES = new Set([
  "Ayaklı Boy Aynası",
  "Ay Temalı Dekoratif Duvar Panosu",
  "Tripod Dekoratif Saat",
]);

const OFFICE_CATEGORY_NAME = "Ofis Mobilya";
const GARDEN_CATEGORY_NAME = "Bahçe Mobilyası";
const DECOR_CATEGORY_NAME = "Dekorasyon";

function categoryNameFor(productTypeTr: string): string {
  if (GARDEN_TYPES.has(productTypeTr)) return GARDEN_CATEGORY_NAME;
  if (DECOR_TYPES.has(productTypeTr)) return DECOR_CATEGORY_NAME;
  return OFFICE_CATEGORY_NAME;
}

export default async function import_furniture_catalog({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  if (!fs.existsSync(PRODUCTS_JSON)) {
    logger.info(`Skip: ${PRODUCTS_JSON} not found.`);
    return;
  }
  const source = JSON.parse(fs.readFileSync(PRODUCTS_JSON, "utf8"));
  const products: any[] = source.products;
  logger.info(`Loaded ${products.length} furniture products from package.`);

  // ---- remove the old single placeholder product (Ahmed: delete it) ----
  const { data: existingProducts } = await query.graph({
    entity: "product",
    fields: ["id", "handle"],
  });
  const placeholder = (existingProducts as any[]).find(
    (p) => p.handle === "ofis-mobilyalari"
  );
  if (placeholder) {
    await deleteProductsWorkflow(container).run({
      input: { ids: [placeholder.id] },
    });
    logger.info(`Deleted old placeholder product "ofis-mobilyalari".`);
  }

  // ---- ensure the three categories exist ----
  const { data: existingCategories } = await query.graph({
    entity: "product_category",
    fields: ["id", "name"],
  });
  const byName = new Map((existingCategories as any[]).map((c) => [c.name, c]));

  const neededCategoryNames = [
    OFFICE_CATEGORY_NAME,
    GARDEN_CATEGORY_NAME,
    DECOR_CATEGORY_NAME,
  ];
  const toCreate = neededCategoryNames.filter((name) => !byName.has(name));
  if (toCreate.length) {
    const { result: created } = await createProductCategoriesWorkflow(
      container
    ).run({
      input: {
        product_categories: toCreate.map((name) => ({
          name,
          is_active: true,
        })),
      },
    });
    for (const c of created as any[]) byName.set(c.name, c);
    logger.info(`Created categories: ${toCreate.join(", ")}`);
  }

  // ---- idempotency: skip anything already imported by handle ----
  const { data: existingAfterDelete } = await query.graph({
    entity: "product",
    fields: ["id", "handle"],
  });
  const existingHandles = new Set(
    (existingAfterDelete as any[]).map((p) => p.handle)
  );

  const { data: salesChannels } = await query.graph({
    entity: "sales_channel",
    fields: ["id", "name"],
  });
  const defaultSalesChannel = salesChannels[0];

  let created = 0;
  let skipped = 0;
  let failed = 0;
  const unresolvedConflicts: string[] = [];
  const confirmationNeeded: Record<string, string[]> = {};

  for (const p of products) {
    const handle = p.import_reference;
    if (existingHandles.has(handle)) {
      skipped++;
      continue;
    }

    try {
      const imagePath = path.join(ASSETS_DIR, "images", path.basename(p.image.path));
      if (!fs.existsSync(imagePath)) {
        logger.warn(`Missing image for ${handle}: ${imagePath} - skipping.`);
        failed++;
        continue;
      }
      const buffer = fs.readFileSync(imagePath);
      const { result: uploaded } = await uploadFilesWorkflow(container).run({
        input: {
          files: [
            {
              filename: path.basename(imagePath),
              mimeType: "image/webp",
              content: buffer.toString("binary"),
              access: "public",
            },
          ],
        },
      });
      const imageUrl = (uploaded as any[])[0]?.url;
      if (!imageUrl) {
        logger.warn(`Image upload returned no URL for ${handle} - skipping.`);
        failed++;
        continue;
      }

      const categoryName = categoryNameFor(p.specifications.product_type.tr);
      const category = byName.get(categoryName);
      if (!category) {
        logger.warn(`Category "${categoryName}" missing for ${handle} - skipping.`);
        failed++;
        continue;
      }

      await createProductsWorkflow(container).run({
        input: {
          products: [
            {
              title: p.titles.tr,
              handle,
              category_ids: [category.id],
              status: ProductStatus.DRAFT,
              images: [{ url: imageUrl }],
              thumbnail: imageUrl,
              options: [
                { title: "Default option", values: ["Default option value"] },
              ],
              variants: [
                {
                  title: p.titles.tr,
                  sku: handle,
                  options: { "Default option": "Default option value" },
                  manage_inventory: false,
                },
              ],
              metadata: {
                translations: {
                  tr: p.titles.tr,
                  en: p.titles.en,
                  bg: p.titles.bg,
                  ar: p.titles.ar,
                },
                specifications: p.specifications,
                source_description_tr: p.source_description_tr,
                source_row: p.source.row,
                image_description_conflict: p.image_description_conflict,
                supplier_confirmation_needed: p.supplier_confirmation_needed,
                source: "furniture_supplier_package_2026_10_02",
              },
              sales_channels: defaultSalesChannel
                ? [{ id: defaultSalesChannel.id }]
                : [],
            },
          ],
        },
      });

      created++;
      if (p.image_description_conflict) {
        unresolvedConflicts.push(`${handle}: ${p.image_description_conflict}`);
      }
      if (p.supplier_confirmation_needed?.length) {
        confirmationNeeded[handle] = p.supplier_confirmation_needed;
      }
    } catch (err: any) {
      logger.warn(`Failed to import ${handle}: ${err?.message ?? err}`);
      failed++;
    }
  }

  logger.info(
    `Furniture import done: ${created} created, ${skipped} skipped (already existed), ${failed} failed.`
  );
  if (unresolvedConflicts.length) {
    logger.info(
      `Products with an unresolved image/description conflict (review before publishing):\n` +
        unresolvedConflicts.map((c) => ` - ${c}`).join("\n")
    );
  }
  logger.info(
    `All ${created} new products are DRAFT with no price - review in Admin, set real prices/stock, then publish.`
  );
}
