import * as fs from "fs";
import * as path from "path";
import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import {
  createAndLinkProductOptionsToProductWorkflow,
  updateProductVariantsWorkflow,
} from "@medusajs/medusa/core-flows";

// Applies the subset of the external review's structured_spec_patch entries that are pure
// additions/corrections (a real {value, unit} to set) - NOT the ones that say to remove an
// attribute entirely (patch value null). Deliberately excluded: this session already caused
// one irreversible hard-delete incident via a product-option cleanup script
// (clean-all-orphaned-option-values.ts) - any "remove this attribute from this product"
// operation needs its own careful, separately-reviewed pass, not folded in here.
const KEY_TO_OPTION: Record<string, string> = {
  width: "Genişlik",
  length: "Uzunluk",
  thickness: "Kalınlık",
  weight: "Ağırlık",
};

type Patch = { value: number; unit: string };
type Item = {
  handle: string;
  patch: Record<string, Patch>;
  // Known-good current values, read directly from the live DB right before this
  // file was generated - used as-is rather than re-querying the variant's option
  // relation here, whose exact query.graph field path for this nested shape
  // (variant -> option_value -> option) isn't independently verified.
  current: Record<string, string>;
};

function formatValue(v: Patch): string {
  return `${v.value} ${v.unit}`;
}

export default async function apply_safe_spec_corrections({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const items: Item[] = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, "../../../../safe_spec_corrections.json"), "utf8")
  );

  const optionTitles = [...new Set(Object.values(KEY_TO_OPTION))];
  const { data: allOptions } = await query.graph({
    entity: "product_option",
    fields: ["id", "title", "values.id", "values.value"],
    filters: { title: optionTitles },
  });
  const optionByTitle = new Map((allOptions as any[]).map((o) => [o.title, o]));

  let fixed = 0, failed = 0;

  for (const item of items) {
    try {
      const { data: products } = await query.graph({
        entity: "product",
        fields: ["id", "title", "variants.id"],
        filters: { handle: [item.handle] },
      });
      const product = (products as any[])[0];
      if (!product) {
        logger.info(`WARNING - product not found: ${item.handle}`);
        failed++;
        continue;
      }
      const variant = product.variants[0];
      const currentOptions: Record<string, string> = { ...item.current };

      const updateInput: any[] = [];
      const addInput: any[] = [];
      const newOptionValues: Record<string, string> = {};

      for (const [key, patch] of Object.entries(item.patch)) {
        const optionTitle = KEY_TO_OPTION[key];
        const option = optionByTitle.get(optionTitle);
        if (!option) {
          logger.info(`WARNING - option "${optionTitle}" not found globally, skipping ${item.handle}/${key}`);
          continue;
        }
        const displayValue = formatValue(patch);
        const existingValue = option.values.find((v: any) => v.value === displayValue);
        const alreadyLinked = optionTitle in item.current;
        if (alreadyLinked) {
          // update: this product is already linked to the option - add the
          // (possibly new) value to that existing link.
          updateInput.push({
            product_option_id: option.id,
            add: existingValue ? [existingValue.id] : [{ value: displayValue }],
          });
        } else {
          // add: the option itself isn't linked to this product yet.
          addInput.push(
            existingValue
              ? { id: option.id, value_ids: [existingValue.id] }
              : { id: option.id, values: [displayValue] }
          );
        }
        newOptionValues[optionTitle] = displayValue;
      }

      if (!updateInput.length && !addInput.length) {
        logger.info(`Nothing to apply for ${item.handle}`);
        continue;
      }

      await createAndLinkProductOptionsToProductWorkflow(container).run({
        input: {
          product_id: product.id,
          ...(addInput.length ? { add: addInput } : {}),
          ...(updateInput.length ? { update: updateInput } : {}),
        },
      });

      const mergedOptions = { ...currentOptions, ...newOptionValues };
      await updateProductVariantsWorkflow(container).run({
        input: {
          product_variants: [{ id: variant.id, options: mergedOptions }],
        },
      });

      logger.info(`Fixed ${item.handle}: ${JSON.stringify(newOptionValues)}`);
      fixed++;
    } catch (e: any) {
      failed++;
      logger.info(`FAILED ${item.handle}: ${String(e?.message || e)}`);
    }
  }

  logger.info(`Safe spec corrections: fixed ${fixed}, failed ${failed}.`);
}
