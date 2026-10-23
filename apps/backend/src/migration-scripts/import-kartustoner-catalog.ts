import * as fs from "fs";
import * as path from "path";
import { MedusaContainer } from "@medusajs/framework";
import {
  ContainerRegistrationKeys,
  ProductStatus,
} from "@medusajs/framework/utils";
import {
  createProductsWorkflow,
  uploadFilesWorkflow,
} from "@medusajs/medusa/core-flows";

// One-shot import of 213 cartridge/toner products from Ahmed's supplier
// catalog docx, same pipeline as import-stationery-catalog.ts: parsed +
// translated offline into kartustoner-import-assets/kartustoner-i18n.json.
// No prices in the source -> DRAFT, unpriced, same as every other batch
// import in this repo. Raw Turkish stays the live `title` (no per-product
// translation mechanism on the storefront yet - see CLAUDE.md); en/bg/ar
// live in metadata.translations. Idempotent - safe to re-run.
const ASSETS_DIR = path.resolve(__dirname, "kartustoner-import-assets");
const PRODUCTS_JSON = path.join(ASSETS_DIR, "kartustoner-i18n.json");
const CATEGORY_NAME = "Kartuş ve Toner";

export default async function import_kartustoner_catalog({
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
  logger.info(`Loaded ${products.length} cartridge/toner products from package.`);

  const { data: categories } = await query.graph({
    entity: "product_category",
    fields: ["id", "name"],
  });
  const category = (categories as any[]).find((c) => c.name === CATEGORY_NAME);
  if (!category) {
    logger.info(`Skip: category "${CATEGORY_NAME}" not found - run reorganize-categories first.`);
    return;
  }

  const { data: salesChannels } = await query.graph({
    entity: "sales_channel",
    fields: ["id", "name"],
  });
  const defaultSalesChannel = salesChannels[0];

  let created = 0;
  let skipped = 0;
  let failed = 0;
  const failedRefs: string[] = [];

  for (const p of products) {
    const handle = p.import_reference;

    const { data: existing } = await query.graph({
      entity: "product",
      fields: ["id"],
      filters: { handle },
    });
    if ((existing as any[]).length) {
      skipped++;
      continue;
    }

    try {
      const imagePath = path.join(ASSETS_DIR, "images", `${handle}.jpeg`);
      if (!fs.existsSync(imagePath)) {
        logger.warn(`Missing image for ${handle}: ${imagePath} - skipping.`);
        failed++;
        failedRefs.push(handle);
        continue;
      }
      const buffer = fs.readFileSync(imagePath);
      const { result: uploaded } = await uploadFilesWorkflow(container).run({
        input: {
          files: [
            {
              filename: `${handle}.jpeg`,
              mimeType: "image/jpeg",
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
        failedRefs.push(handle);
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
                  tr: { title: p.titles.tr, description: p.descriptions.tr, specs: p.specifications.tr },
                  en: { title: p.titles.en, description: p.descriptions.en, specs: p.specifications.en },
                  bg: { title: p.titles.bg, description: p.descriptions.bg, specs: p.specifications.bg },
                  ar: { title: p.titles.ar, description: p.descriptions.ar, specs: p.specifications.ar },
                },
                source: "kartustoner_docx_import_2026_10_03",
              },
              sales_channels: defaultSalesChannel
                ? [{ id: defaultSalesChannel.id }]
                : [],
            },
          ],
        },
      });

      created++;
      if (created % 50 === 0) {
        logger.info(`Progress: ${created} created so far...`);
      }
    } catch (err: any) {
      logger.warn(`Failed to import ${handle}: ${err?.message ?? err}`);
      failed++;
      failedRefs.push(handle);
    }
  }

  logger.info(
    `Kartuş/Toner import done: ${created} created, ${skipped} skipped (already existed), ${failed} failed.`
  );
  if (failedRefs.length) {
    logger.info(`Failed refs (re-run this script to retry them): ${failedRefs.join(", ")}`);
  }
  logger.info(
    `All ${created} new products are DRAFT with no price - review in Admin, set real prices/stock, then publish.`
  );
}
