import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

// While deleting the 123 confirmed-junk "ps-<hex>" legacy products from the
// admin UI, real BizimHesap-sourced products got swept up by mistake (same
// screen, list re-sorted after each delete). Medusa soft-deletes, so nothing
// is actually gone - this restores every non-junk product currently marked
// deleted_at, verified by SKU: keep the 8 demo electronics products deleted
// (their SKUs are the ACME/MOUSE/KEYBOARD/PHONE/HEADPHONE/WEBCAM/SPEAKER/5xx
// pattern), restore everything else.
const JUNK_SKU_PATTERN = /^ps-|^(ACME|MOUSE|KEYBOARD|PHONE|HEADPHONE|WEBCAM|SPEAKER|512|256)-/;

export default async function restore_accidentally_deleted_products({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const productModuleService = container.resolve(Modules.PRODUCT);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const { data: deletedProducts } = await query.graph({
    entity: "product",
    fields: ["id", "variants.sku"],
    filters: { deleted_at: { $ne: null } } as any,
    withDeleted: true,
  } as any);

  const toRestore = (deletedProducts as any[]).filter((p) => {
    const skus: string[] = (p.variants ?? []).map((v: any) => v.sku).filter(Boolean);
    return !skus.some((sku) => JUNK_SKU_PATTERN.test(sku));
  });

  logger.info(`Found ${deletedProducts.length} deleted products, restoring ${toRestore.length}.`);

  if (!toRestore.length) {
    logger.info("Nothing to restore.");
    return;
  }

  await productModuleService.restoreProducts(toRestore.map((p) => p.id));
  logger.info(`Restored ${toRestore.length} products.`);
}
