import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { deleteProductCategoriesWorkflow } from "@medusajs/medusa/core-flows";

// One-off cleanup: the B2B starter template ships 4 demo categories
// (Laptops, Accessories, Monitors, Phones) with 0 real products, left over
// from before the real catalog was imported. They were cluttering the
// category sidebar/breadcrumb with irrelevant electronics categories.
const DEMO_HANDLES = ["laptops", "accessories", "monitors", "phones"];

export default async function remove_demo_categories({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const { data: categories } = await query.graph({
    entity: "product_category",
    fields: ["id", "name", "handle", "products.id"],
  });

  const toDelete = (categories as any[]).filter((c) =>
    DEMO_HANDLES.includes(c.handle)
  );

  const nonEmpty = toDelete.filter((c) => (c.products || []).length > 0);
  if (nonEmpty.length) {
    logger.info(
      `Refusing to delete: these demo-handle categories actually have products: ${nonEmpty
        .map((c) => `${c.handle} (${c.products.length})`)
        .join(", ")}`
    );
    return;
  }

  if (!toDelete.length) {
    logger.info("No demo categories found - nothing to delete.");
    return;
  }

  await deleteProductCategoriesWorkflow(container).run({
    input: toDelete.map((c) => c.id),
  });

  logger.info(
    `Deleted ${toDelete.length} empty demo categories: ${toDelete
      .map((c) => c.handle)
      .join(", ")}`
  );
}
