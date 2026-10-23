import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import {
  deleteProductCategoriesWorkflow,
  updateProductsWorkflow,
} from "@medusajs/medusa/core-flows";

// One-off cleanup: the B2B starter template ships 4 demo categories
// (Laptops, Accessories, Monitors, Phones), left over from before the real
// catalog was imported, cluttering the category sidebar/breadcrumb with
// irrelevant electronics categories. Ahmed asked for them gone entirely.
//
// Their 8 linked demo products have real order-history line items (16
// confirmed e2e-test orders, buyer-e2e-*@example.invalid - not real
// customers, but still real rows), so this only detaches them from these
// categories (category_ids: []) rather than deleting the products - the
// safe way to empty a category without touching order history or risking
// a delete blocked/cascaded by those references.
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

  if (!toDelete.length) {
    logger.info("No demo categories found - nothing to delete.");
    return;
  }

  const productIds = Array.from(
    new Set(
      toDelete.flatMap((c) => (c.products || []).map((p: any) => p.id))
    )
  );
  if (productIds.length) {
    await updateProductsWorkflow(container).run({
      input: {
        selector: { id: productIds },
        update: { category_ids: [] },
      },
    });
    logger.info(
      `Detached ${productIds.length} demo product(s) from their categories (left as uncategorized, untouched otherwise).`
    );
  }

  await deleteProductCategoriesWorkflow(container).run({
    input: toDelete.map((c) => c.id),
  });

  logger.info(
    `Deleted ${toDelete.length} demo categories: ${toDelete
      .map((c) => c.handle)
      .join(", ")}`
  );
}
