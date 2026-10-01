import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { updateProductsWorkflow } from "@medusajs/medusa/core-flows";

// The product restore brought the 50 products back, but their
// product_sales_channel link rows are still soft-deleted from the same
// accidental-delete incident, so they're invisible to the storefront even
// though the product itself is active again. Re-asserting sales_channels
// via the workflow reactivates the existing link.
const SALES_CHANNEL_ID = "sc_01M3FP02XBFQQZX0Z34EQHV8EC";

export default async function restore_sales_channel_links({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "sales_channels.id"],
    pagination: { take: 1000, skip: 0 },
  });

  const needsLink = (products as any[]).filter(
    (p) => !(p.sales_channels ?? []).some((sc: any) => sc.id === SALES_CHANNEL_ID)
  );

  logger.info(`${needsLink.length} products missing the sales channel link.`);
  if (!needsLink.length) return;

  const BATCH = 50;
  for (let i = 0; i < needsLink.length; i += BATCH) {
    const batch = needsLink.slice(i, i + BATCH);
    await updateProductsWorkflow(container).run({
      input: {
        selector: { id: batch.map((p) => p.id) },
        update: { sales_channels: [{ id: SALES_CHANNEL_ID }] },
      },
    });
  }
  logger.info(`Relinked ${needsLink.length} products to the sales channel.`);
}
