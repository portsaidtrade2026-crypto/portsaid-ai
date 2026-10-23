import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

// restoreProducts() brings back the product rows but not the link-module rows
// (sales channel, variant price set) that deleteProductsWorkflow soft-deleted,
// so restored products stay invisible to the storefront. Restore those links
// through Medusa's remote link API. Companion to
// restore-bizimhesap-categories.ts.
const PRODUCT_IDS = [
  "prod_01M3W28T2YEWW81PQKJT96GESV",
  "prod_01M3W2934WZS5FSGQTE7N1288D",
  "prod_01M3W2941XZJ66YM5N6RTD6EE7",
  "prod_01M3W294Q235QMFXSG1G58XVKC",
  "prod_01M3W2957R37471DKADMKRYTTY",
  "prod_01M3W295Q1YF5G5JJB037JKJC0",
  "prod_01M3W2965KM54F0QHWBX170FXN",
  "prod_01M3W2973EHE1604K0S97VE3KG",
  "prod_01M3W2851BTS4H3WYK7EGXA5BD",
  "prod_01M3W285FJ5P1CVRF2D7004YDZ",
  "prod_01M3W285V2ER44ESQJDT39D2NN",
  "prod_01M3W28B4NAAEQVFB7522VW35Q",
  "prod_01M3W296MZGED0CKQ9SZYDRWHM",
];

export default async function restore_product_links({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const link: any = container.resolve(ContainerRegistrationKeys.LINK);

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "title", "variants.id", "sales_channels.id"],
    filters: { id: PRODUCT_IDS },
  });
  const variantIds = (products as any[]).flatMap((p) => p.variants.map((v: any) => v.id));
  const noChannel = (products as any[]).filter((p) => !p.sales_channels?.length).length;
  logger.info(`${products.length} products, ${variantIds.length} variants, ${noChannel} without sales channel`);

  await link.restore({ [Modules.PRODUCT]: { product_id: PRODUCT_IDS } });
  await link.restore({ [Modules.PRODUCT]: { variant_id: variantIds } });

  const { data: after } = await query.graph({
    entity: "product",
    fields: ["id", "sales_channels.id", "variants.price_set.id"],
    filters: { id: PRODUCT_IDS },
  });
  const stillNoChannel = (after as any[]).filter((p) => !p.sales_channels?.length).length;
  logger.info(`After restore: ${stillNoChannel} products without sales channel`);
}
