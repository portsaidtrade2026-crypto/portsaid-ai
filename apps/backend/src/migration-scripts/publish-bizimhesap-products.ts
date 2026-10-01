import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys, ProductStatus } from "@medusajs/framework/utils";
import { updateProductsWorkflow } from "@medusajs/medusa/core-flows";

// Publishes every BizimHesap-synced product (metadata.source ==
// "bizimhesap_sync") that's still Draft - the 146 products from
// sync-remaining-products-from-bizimhesap.ts, scoped by source so it never
// touches unrelated draft products from other imports.
export default async function publish_bizimhesap_products({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "status", "metadata"],
  });

  const toPublish = (products as any[]).filter(
    (p) => p.metadata?.source === "bizimhesap_sync" && p.status === ProductStatus.DRAFT
  );

  if (!toPublish.length) {
    logger.info("Nothing to publish - no draft bizimhesap_sync products found.");
    return;
  }

  const BATCH = 50;
  let published = 0;
  for (let i = 0; i < toPublish.length; i += BATCH) {
    const batch = toPublish.slice(i, i + BATCH);
    await updateProductsWorkflow(container).run({
      input: {
        selector: { id: batch.map((p) => p.id) },
        update: { status: ProductStatus.PUBLISHED },
      },
    });
    published += batch.length;
  }

  logger.info(`Published ${published} of ${toPublish.length} bizimhesap_sync products.`);
}
