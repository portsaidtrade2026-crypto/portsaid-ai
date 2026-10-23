import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

// Comprehensive sweep of the filter sidebar bug: /store/product-options lists
// every global option VALUE regardless of whether any live (non-deleted,
// published) product variant still references it - confirmed repeatedly
// today (demo Storage/Memory, Kalınlık's "mic" duplicates, color/length/
// stated-weight tied to since-deleted legacy products, Uzunluk's stray "mm"
// values from the same deleted products). Rather than keep finding these one
// at a time, this deletes every option value across every non-exclusive
// option that has zero published+non-deleted variants pointing at it, then
// removes any option left with zero values.
export default async function clean_all_orphaned_option_values({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const productModuleService = container.resolve(Modules.PRODUCT);

  const { data: options } = await query.graph({
    entity: "product_option",
    fields: [
      "id",
      "title",
      "is_exclusive",
      "values.id",
      "values.value",
      "values.variants.id",
      "values.variants.product.status",
      "values.variants.product.deleted_at",
    ],
    pagination: { take: 1000, skip: 0 },
  });

  const sharedOptions = (options as any[]).filter((o) => !o.is_exclusive);

  let deletedValues = 0;
  let deletedOptions = 0;
  const report: string[] = [];

  for (const option of sharedOptions) {
    const values = option.values ?? [];
    const orphanedValueIds: string[] = [];
    let liveCount = 0;

    for (const v of values) {
      const hasLiveVariant = (v.variants ?? []).some(
        (variant: any) =>
          variant.product &&
          variant.product.status === "published" &&
          !variant.product.deleted_at
      );
      if (hasLiveVariant) {
        liveCount++;
      } else {
        orphanedValueIds.push(v.id);
      }
    }

    if (orphanedValueIds.length) {
      await productModuleService.deleteProductOptionValues(orphanedValueIds);
      deletedValues += orphanedValueIds.length;
      report.push(`${option.title}: removed ${orphanedValueIds.length} orphaned value(s), ${liveCount} kept`);
    }

    if (liveCount === 0) {
      await productModuleService.deleteProductOptions([option.id]);
      deletedOptions++;
      report.push(`${option.title}: option itself removed (no live values left)`);
    }
  }

  logger.info(`Done. Deleted ${deletedValues} orphaned values and ${deletedOptions} empty options.`);
  if (report.length) logger.info(report.join("\n"));
}
