import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import {
  deleteProductCategoriesWorkflow,
  deleteProductsWorkflow,
} from "@medusajs/medusa/core-flows";

// Ahmed does not stock these lines, so their categories and products come off
// the site. Both workflows soft-delete (deleted_at), so products are
// recoverable with productModuleService.restoreProducts(). Dry run by default;
// set APPLY=1 to delete.
const HANDLES = [
  "solvent-bant",
  "çelik-çember",
  "çöp-torbaları",
  "karton-kutu-ve-kağıt-çantalar",
  "çemberleme-ekipmanları",
  "eps-levha",
];

export default async function remove_unstocked_categories({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const apply = process.env.APPLY === "1";
  const wanted = new Set(HANDLES.map((h) => h.normalize("NFC")));

  const { data: all } = await query.graph({
    entity: "product_category",
    fields: ["id", "name", "handle", "category_children.id", "products.id", "products.title"],
  });
  const cats = (all as any[]).filter((c) =>
    wanted.has(String(c.handle).normalize("NFC"))
  );
  logger.info(`Matched ${cats.length}/${HANDLES.length} categories`);

  const productIds = new Set<string>();
  for (const c of cats) {
    if (c.category_children?.length) {
      throw new Error(`Category ${c.name} has subcategories - aborting`);
    }
    logger.info(`${c.name}: ${c.products.length} products`);
    for (const p of c.products) {
      logger.info(`  - ${p.id} ${p.title}`);
      productIds.add(p.id);
    }
  }

  if (!apply) {
    logger.info(`DRY RUN: would delete ${productIds.size} products and ${cats.length} categories`);
    return;
  }

  if (productIds.size) {
    await deleteProductsWorkflow(container).run({ input: { ids: [...productIds] } });
  }
  await deleteProductCategoriesWorkflow(container).run({
    input: cats.map((c) => c.id),
  });
  logger.info(`Deleted ${productIds.size} products and ${cats.length} categories`);
}
