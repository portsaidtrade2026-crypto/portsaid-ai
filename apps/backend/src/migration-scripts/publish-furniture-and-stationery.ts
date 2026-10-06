import { MedusaContainer } from "@medusajs/framework";
import {
  ContainerRegistrationKeys,
  ProductStatus,
} from "@medusajs/framework/utils";
import { updateProductsWorkflow } from "@medusajs/medusa/core-flows";

// Publishes every DRAFT product created by the docx batch imports
// (import-stationery-catalog.ts, import-kartustoner-catalog.ts) so they go
// live on the storefront. Ahmed's explicit call (2026-10-03): publish
// as-is, unpriced - consistent with how every other product on this site
// already works (no live price, "Fiyat için teklif isteyin" / request a
// quote). Only touches products tagged with these import sources, so it
// can't accidentally publish something unrelated still sitting in draft
// for its own reasons. (The furniture import is handled separately -
// Ahmed took care of it himself.)
const SOURCES = [
  "stationery_docx_import_2026_10_03",
  "kartustoner_docx_import_2026_10_03",
];

export default async function publish_furniture_and_stationery({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  let totalPublished = 0;
  for (const source of SOURCES) {
    const { data: products } = await query.graph({
      entity: "product",
      fields: ["id", "status", "metadata"],
    });
    const toPublish = (products as any[]).filter(
      (p) => p.status === ProductStatus.DRAFT && p.metadata?.source === source
    );

    if (!toPublish.length) {
      logger.info(`"${source}": no draft products found - skipping.`);
      continue;
    }

    // batch in chunks of 100 to keep each workflow call small
    const chunkSize = 100;
    for (let i = 0; i < toPublish.length; i += chunkSize) {
      const chunk = toPublish.slice(i, i + chunkSize);
      await updateProductsWorkflow(container).run({
        input: {
          selector: { id: chunk.map((p) => p.id) },
          update: { status: ProductStatus.PUBLISHED },
        },
      });
    }
    logger.info(`"${source}": published ${toPublish.length} products.`);
    totalPublished += toPublish.length;
  }

  logger.info(`Done - ${totalPublished} products published in total.`);
}
