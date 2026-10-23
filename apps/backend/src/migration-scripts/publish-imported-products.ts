import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys, ProductStatus } from "@medusajs/framework/utils";
import { updateProductsWorkflow } from "@medusajs/medusa/core-flows";

// Publishes every imported catalog product (metadata.source ==
// "portsaid_catalog_import") that's still Draft - deliberately scoped to
// just that source so it never touches the original demo products, which
// are unrelated legacy records with their own history.
export default async function publish_imported_products({
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
    (p) =>
      p.metadata?.source === "portsaid_catalog_import" &&
      p.status === ProductStatus.DRAFT
  );

  if (!toPublish.length) {
    logger.info("Nothing to publish - no draft imported-catalog products found.");
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

  logger.info(`Published ${published} of ${toPublish.length} imported-catalog products.`);
}
