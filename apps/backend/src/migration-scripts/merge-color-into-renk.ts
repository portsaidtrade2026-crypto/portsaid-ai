import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { updateProductVariantsWorkflow, updateProductsWorkflow } from "@medusajs/medusa/core-flows";

// The lowercase "color" option (1 product, "Karton koli", 3 variants) was a
// stray duplicate of the real "Renk" option - same English-valued vocabulary
// (Renk's values happen to be English words like "orange"/"red" despite the
// Turkish title), so this is a 1:1 value match, not a translation job.
const REASSIGN: { variantId: string; value: string }[] = [
  { variantId: "variant_01M3FP14ZFG86J8KHFMSJ4699B", value: "orange" },
  { variantId: "variant_01M3FP14ZFHTQJENQH6KC5B5FV", value: "red" },
  { variantId: "variant_01M3FP14ZFV8BMVA95NYRB18D6", value: "Belirtilmemiş" },
];

export default async function merge_color_into_renk({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const productModuleService = container.resolve(Modules.PRODUCT);

  // The variants only ever used the stray "color" option - the product
  // itself was never linked to the global "Renk" option, so assigning a
  // Renk value to a variant fails until the product opts into it. Updating
  // the product with options:[{title:"Renk",...}] links it to the existing
  // global option (title is globally unique for non-exclusive options)
  // instead of creating a duplicate.
  await updateProductsWorkflow(container).run({
    input: {
      selector: { id: "prod_01M3FP14XR9JPDE4K18PR9BH5N" },
      update: {
        options: [
          { title: "color", values: ["orange", "red", "Belirtilmemiş"] },
          { title: "Renk", values: ["orange", "red", "Belirtilmemiş"] },
        ],
      },
    },
  });
  logger.info('Linked product to "Renk".');

  for (const { variantId, value } of REASSIGN) {
    await updateProductVariantsWorkflow(container).run({
      input: {
        product_variants: [{ id: variantId, options: { Renk: value } }],
      },
    });
  }
  logger.info(`Reassigned ${REASSIGN.length} variants from "color" to "Renk".`);

  const colorOption = await productModuleService.listProductOptions(
    { title: "color" },
    { relations: ["values"] }
  );
  if (!colorOption.length) {
    logger.info('No "color" option found - nothing left to clean up.');
    return;
  }
  const valueIds = colorOption.flatMap((o) => (o.values ?? []).map((v) => v.id));
  if (valueIds.length) {
    await productModuleService.deleteProductOptionValues(valueIds);
  }
  await productModuleService.deleteProductOptions(colorOption.map((o) => o.id));
  logger.info(`Deleted the now-orphaned "color" option and its ${valueIds.length} values.`);
}
