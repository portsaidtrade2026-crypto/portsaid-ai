import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import {
  createAndLinkProductOptionsToProductWorkflow,
  updateProductVariantsWorkflow,
} from "@medusajs/medusa/core-flows";
import parsedAttrs from "./parsed-attrs-test3.json";

// Rebuilds the filter attributes (Kalınlık/Uzunluk/Genişlik/Ağırlık/Masura
// Ağırlığı/Renk) that an earlier buggy cleanup script accidentally
// hard-deleted. Re-derived by regex-parsing each product's own title (see
// parse_attrs.js) since BizimHesap's API never carried this as structured
// data - only free text.
//
// createAndLinkProductOptionsToProductWorkflow's `add` with a bare
// {title, values} errors "already exists" the second time any title is
// reused, so each option title is created exactly once (on the first product
// that needs it, seeded with every distinct value parsed for that title
// across the whole catalog), then every other product links to that same
// option+value by id instead of trying to recreate it.
const ATTR_TITLES: Record<string, string> = {
  Kalinlik: "Kalınlık",
  Uzunluk: "Uzunluk",
  Genislik: "Genişlik",
  Agirlik: "Ağırlık",
  MasuraAgirligi: "Masura Ağırlığı",
  Renk: "Renk",
};

type Row = {
  productId: string;
  variantId: string;
  title: string;
  attrs: Record<string, string>;
};

export default async function rebuild_attributes_from_titles({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const rows = (parsedAttrs as Row[]).filter(
    (r) => Object.keys(r.attrs).length > 0
  );

  // All distinct values needed per option title, across every product.
  const valuesByTitle: Record<string, Set<string>> = {};
  for (const row of rows) {
    for (const [key, value] of Object.entries(row.attrs)) {
      const title = ATTR_TITLES[key];
      (valuesByTitle[title] ??= new Set()).add(value);
    }
  }

  // title -> { optionId, valueIdByValue }
  const optionCache: Record<
    string,
    { optionId: string; valueIdByValue: Record<string, string> }
  > = {};

  async function loadOptionCache(title: string) {
    const { data: options } = await query.graph({
      entity: "product_option",
      fields: ["id", "values.id", "values.value"],
      filters: { title },
    });
    const opt = (options as any[])[0];
    if (!opt) return null;
    const valueIdByValue: Record<string, string> = {};
    for (const v of opt.values ?? []) valueIdByValue[v.value] = v.id;
    optionCache[title] = { optionId: opt.id, valueIdByValue };
    return optionCache[title];
  }

  let ok = 0;
  let failed = 0;
  const failures: string[] = [];

  for (const row of rows) {
    try {
      const { data: variants } = await query.graph({
        entity: "product_variant",
        fields: ["id", "options.option.title", "options.value"],
        filters: { id: row.variantId },
      });
      const variant = (variants as any[])[0];
      const baseOptions: Record<string, string> = {};
      for (const o of variant?.options ?? []) {
        if (o.option?.title) baseOptions[o.option.title] = o.value;
      }

      const newOptions: Record<string, string> = { ...baseOptions };

      for (const [key, value] of Object.entries(row.attrs)) {
        const title = ATTR_TITLES[key];
        newOptions[title] = value;
        if (title in baseOptions) continue; // product already linked

        let cached = optionCache[title] ?? (await loadOptionCache(title));

        if (!cached) {
          // First product to need this title: create it with every value
          // this parse run will ever use for it, seeded on this product.
          await createAndLinkProductOptionsToProductWorkflow(container).run({
            input: {
              product_id: row.productId,
              add: [{ title, values: Array.from(valuesByTitle[title]) }],
            },
          });
          cached = await loadOptionCache(title);
        } else {
          // Option already exists (maybe missing this exact value if it
          // wasn't seeded, e.g. a value discovered after caching) - link it,
          // creating the value too if genuinely new.
          const valueId = cached.valueIdByValue[value];
          await createAndLinkProductOptionsToProductWorkflow(container).run({
            input: {
              product_id: row.productId,
              add: valueId
                ? [{ id: cached.optionId, value_ids: [valueId] }]
                : [{ id: cached.optionId, value_ids: [] }],
            },
          });
          if (!valueId) {
            // Value wasn't part of the seeded set - add it via update.
            await createAndLinkProductOptionsToProductWorkflow(container).run({
              input: {
                product_id: row.productId,
                update: [{ product_option_id: cached.optionId, add: [{ value }] }],
              },
            });
            cached = await loadOptionCache(title);
          }
        }
      }

      await updateProductVariantsWorkflow(container).run({
        input: {
          product_variants: [{ id: row.variantId, options: newOptions }],
        },
      });

      ok++;
    } catch (err: any) {
      failed++;
      failures.push(`${row.title}: ${err.message}`);
    }

    if ((ok + failed) % 20 === 0) {
      logger.info(`Progress: ${ok + failed}/${rows.length} (${ok} ok, ${failed} failed)`);
    }
  }

  logger.info(`Done. ${ok} succeeded, ${failed} failed out of ${rows.length}.`);
  if (failures.length) {
    logger.info(`Failures:\n${failures.slice(0, 40).join("\n")}`);
  }
}
