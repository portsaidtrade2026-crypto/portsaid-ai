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

// One-shot import of 1360 office-stationery products from Ahmed's supplier
// catalog docx (Word doc -> mammoth-converted rows: image + title +
// description + spec list, parsed and translated into en/bg/ar offline -
// see stationery-import-assets/stationery-i18n.json). No prices in the
// source, so every product is unpriced/DRAFT like every other batch import
// in this repo - Ahmed reviews, prices, and publishes from Admin.
//
// Per CLAUDE.md there is no per-product title translation mechanism on the
// storefront today, so `title` stays the raw Turkish string (matches the
// existing catalog's convention) and the en/bg/ar titles/descriptions/specs
// generated for this import live in metadata.translations for whenever
// per-product localization is wired up.
//
// This is a LONG-running script (1360 image uploads + product creates) -
// it is idempotent (skips any import_reference whose handle already
// exists), so it is safe to re-run if interrupted partway through.
const ASSETS_DIR = path.resolve(__dirname, "stationery-import-assets");
const PRODUCTS_JSON = path.join(ASSETS_DIR, "stationery-i18n.json");
const CATEGORY_NAME = "Ofis Kırtasiye";

export default async function import_stationery_catalog({
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
  logger.info(`Loaded ${products.length} stationery products from package.`);

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

    // re-check existence per-item (not just once up front) since this run
    // may resume a previous partial run hours later
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
                source: "stationery_docx_import_2026_10_03",
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
    `Stationery import done: ${created} created, ${skipped} skipped (already existed), ${failed} failed.`
  );
  if (failedRefs.length) {
    logger.info(`Failed refs (re-run this script to retry them): ${failedRefs.join(", ")}`);
  }
  logger.info(
    `All ${created} new products are DRAFT with no price - review in Admin, set real prices/stock, then publish.`
  );
}
