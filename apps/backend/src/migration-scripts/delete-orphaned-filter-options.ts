import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

// The /store/product-options endpoint lists every global option regardless
// of whether a live product still uses it (confirmed earlier with the demo
// Storage/Memory options). "color", "length", and "stated-weight" were stray
// duplicates of Renk/Uzunluk/Belirtilen ağırlık on three garbled legacy
// products that are now deleted - zero published variants reference them,
// so they can just be removed outright instead of merged.
const ORPHANED_OPTION_TITLES = ["color", "length", "stated-weight"];

export default async function delete_orphaned_filter_options({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const productModuleService = container.resolve(Modules.PRODUCT);

  for (const title of ORPHANED_OPTION_TITLES) {
    const options = await productModuleService.listProductOptions(
      { title },
      { relations: ["values"] }
    );
    if (!options.length) {
      logger.info(`"${title}": not found, skipping.`);
      continue;
    }
    const valueIds = options.flatMap((o) => (o.values ?? []).map((v) => v.id));
    if (valueIds.length) {
      await productModuleService.deleteProductOptionValues(valueIds);
    }
    await productModuleService.deleteProductOptions(options.map((o) => o.id));
    logger.info(`Deleted option "${title}" and its ${valueIds.length} values.`);
  }
}
