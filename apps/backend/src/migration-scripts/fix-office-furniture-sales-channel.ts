import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { updateProductsWorkflow } from "@medusajs/medusa/core-flows";

// import-office-furniture.ts omitted sales_channels on createProductsWorkflow, so all 69
// products exist (and count correctly in the category sidebar) but never resolved through
// the publishable key's sales channel, making the storefront's own product list - scoped
// by that key - show none of them despite the non-zero count.
const SALES_CHANNEL_ID = "sc_01M3FP02XBFQQZX0Z34EQHV8EC";
const OFIS_MOBILYA_CATEGORY_ID = "pcat_01M3FP305J0YPYXN2KY0EXWC27";

export default async function fix_office_furniture_sales_channel({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "title", "sales_channels.id"],
    filters: { categories: { id: [OFIS_MOBILYA_CATEGORY_ID] } },
  });

  const missing = (products as any[]).filter(
    (p) => !(p.sales_channels || []).some((sc: any) => sc.id === SALES_CHANNEL_ID)
  );

  if (!missing.length) {
    logger.info("All office furniture products already linked - nothing to do.");
    return;
  }

  await updateProductsWorkflow(container).run({
    input: {
      selector: { id: missing.map((p) => p.id) },
      update: { sales_channels: [{ id: SALES_CHANNEL_ID }] },
    },
  });

  logger.info(`Linked ${missing.length} office furniture products to the live sales channel.`);
}
