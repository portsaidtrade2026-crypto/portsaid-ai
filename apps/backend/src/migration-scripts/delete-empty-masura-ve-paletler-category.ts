import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { deleteProductCategoriesWorkflow } from "@medusajs/medusa/core-flows";

// Ahmed: delete the old "Masura ve Paletler" top-level category now that
// its real products have all moved into the new Masura/Palet/Köşebent
// subcategories under Ambalaj Malzemeleri. Only stale links to already
// soft-deleted (junk) products remain attached to it - zero live products.
const MASURA_VE_PALETLER_ID = "pcat_01M3FP0Q6M8MFT39VAH2M42MJ4";

export default async function delete_empty_masura_ve_paletler_category({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const { data: liveProducts } = await query.graph({
    entity: "product",
    fields: ["id", "title"],
    filters: { categories: { id: [MASURA_VE_PALETLER_ID] } },
  });

  if ((liveProducts as any[]).length > 0) {
    logger.info(
      `ABORTED - "Masura ve Paletler" still has ${liveProducts.length} live product(s): ` +
        (liveProducts as any[]).map((p) => p.title).join(", ")
    );
    return;
  }

  await deleteProductCategoriesWorkflow(container).run({
    input: [MASURA_VE_PALETLER_ID],
  });

  logger.info(`Deleted empty category "Masura ve Paletler" (${MASURA_VE_PALETLER_ID}).`);
}
