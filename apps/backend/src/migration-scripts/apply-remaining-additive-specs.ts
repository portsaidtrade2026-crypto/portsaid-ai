import * as fs from "fs";
import * as path from "path";
import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import {
  createAndLinkProductOptionsToProductWorkflow,
  updateProductVariantsWorkflow,
} from "@medusajs/medusa/core-flows";

// The 9 products apply-safe-spec-corrections.ts failed on. Root cause found: that script
// fetched each global option ONCE at the top and reused the same in-memory entity across
// every subsequent workflow call - the first call that added a new value under an option
// left that cached entity in a state ("dirty": true on its values collection, confirmed in
// the error dump) that broke the next call referencing the same option id, even in a brand
// new workflow invocation. Fix: re-fetch the option fresh from the DB immediately before
// each use, never reused across iterations.
const KEY_TO_OPTION: Record<string, string> = {
  width: "Genişlik",
  length: "Uzunluk",
  thickness: "Kalınlık",
  weight: "Ağırlık",
};
const DEFAULT_OPTION_HANDLES = new Set(
  fs
    .readFileSync(path.resolve(__dirname, "../../../../scratch_default_handles2.txt"), "utf8")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
);

type Patch = { value: number; unit: string };
type Item = { handle: string; patch: Record<string, Patch>; current: Record<string, string> };

function formatValue(v: Patch): string {
  return `${v.value} ${v.unit}`;
}

async function fetchOption(query: any, title: string) {
  const { data } = await query.graph({
    entity: "product_option",
    fields: ["id", "title", "values.id", "values.value"],
    filters: { title: [title] },
  });
  return (data as any[])[0];
}

export default async function apply_remaining_additive_specs({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const items: Item[] = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, "../../../../final_additive.json"), "utf8")
  );

  let fixed = 0, failed = 0;

  for (const item of items) {
    try {
      const { data: products } = await query.graph({
        entity: "product",
        fields: ["id", "variants.id"],
        filters: { handle: [item.handle] },
      });
      const product = (products as any[])[0];
      if (!product) {
        logger.info(`WARNING - not found: ${item.handle}`);
        failed++;
        continue;
      }
      const variant = product.variants[0];
      const mergedOptions: Record<string, string> = { ...item.current };
      if (DEFAULT_OPTION_HANDLES.has(item.handle)) {
        mergedOptions["Default option"] = "Default option value";
      }

      for (const [key, patch] of Object.entries(item.patch)) {
        const optionTitle = KEY_TO_OPTION[key];
        const option = await fetchOption(query, optionTitle); // fresh fetch, every time
        if (!option) {
          logger.info(`WARNING - option "${optionTitle}" not found, skipping ${item.handle}/${key}`);
          continue;
        }
        const displayValue = formatValue(patch);
        const existingValue = option.values.find((v: any) => v.value === displayValue);
        const alreadyLinked = optionTitle in item.current;

        if (alreadyLinked) {
          await createAndLinkProductOptionsToProductWorkflow(container).run({
            input: {
              product_id: product.id,
              update: [
                {
                  product_option_id: option.id,
                  add: existingValue ? [existingValue.id] : [{ value: displayValue }],
                },
              ],
            },
          });
        } else {
          await createAndLinkProductOptionsToProductWorkflow(container).run({
            input: {
              product_id: product.id,
              add: [
                existingValue
                  ? { id: option.id, value_ids: [existingValue.id] }
                  : { id: option.id, values: [displayValue] },
              ],
            },
          });
        }
        mergedOptions[optionTitle] = displayValue;
      }

      await updateProductVariantsWorkflow(container).run({
        input: { product_variants: [{ id: variant.id, options: mergedOptions }] },
      });

      logger.info(`Fixed ${item.handle}: ${JSON.stringify(item.patch)}`);
      fixed++;
    } catch (e: any) {
      failed++;
      logger.info(`FAILED ${item.handle}: ${String(e?.message || e)}`);
    }
  }

  logger.info(`Remaining additive specs: fixed ${fixed}, failed ${failed}.`);
}
