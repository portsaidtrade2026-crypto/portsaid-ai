import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { updateProductVariantsWorkflow } from "@medusajs/medusa/core-flows";

// Ahmed flagged the "Kalınlık" (thickness) filter on the live site as broken
// - it listed "17 um" and "17 mic" as separate values for the same thing, so
// filtering by one silently missed products tagged with the other. Checking
// usage: every "X mic" value has 0 variants except "17 mic" (1 variant, a
// messy legacy product from the original bulk import, ps-e3d4... SKU) - the
// "X um" values are what every BizimHesap-sourced product actually uses. So
// this reassigns that one stray variant onto "17 um" and removes the
// now-fully-orphaned "mic" duplicates, leaving one clean value per thickness.
const VARIANT_ID = "variant_01M3FP0QMT0J7XV62K4H1G8CEM";
const CANONICAL_VALUE = "17 um";

const ORPHANED_VALUE_IDS = [
  "optval_01M3P57BES1HESJ0HPW88AV2RM", // 15 mic
  "optval_01M3P57BET5PZWF8Y4G0GVETV3", // 17 mic
  "optval_01M3P57BETV8WANBM6QFFEB974", // 23 mic
  "optval_01M3P57BET5940K17SZ3VB6BXC", // 23 mic sp
  "optval_01M3P57BETCP4BAS0MYW28NKN9", // 25 mic
  "optval_01M3P57BETGJ8RPQRW79P8QCEB", // 37 mic
  "optval_01M3P57BEVCESJ1W737CB19QA7", // 38 mic
  "optval_01M3P57BEVJSM5Z38NXF4JGVZD", // 40 mic
  "optval_01M3P57BEVYWFTWJTS3KZ8DBSP", // 42 mic
];

export default async function clean_kalinlik_duplicate_values({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const productModuleService = container.resolve(Modules.PRODUCT);

  await updateProductVariantsWorkflow(container).run({
    input: {
      product_variants: [
        {
          id: VARIANT_ID,
          options: {
            "Default option": "Default option value",
            Kalınlık: CANONICAL_VALUE,
          },
        },
      ],
    },
  });
  logger.info(`Reassigned variant ${VARIANT_ID} to Kalınlık="${CANONICAL_VALUE}".`);

  // Usage was verified directly against product_variant_option right before
  // writing this script - every id below had 0 variants once the reassign
  // above runs, so this is a plain cleanup, not a conditional check.
  await productModuleService.deleteProductOptionValues(ORPHANED_VALUE_IDS);
  logger.info(`Deleted ${ORPHANED_VALUE_IDS.length} orphaned Kalınlık duplicate values.`);
}
