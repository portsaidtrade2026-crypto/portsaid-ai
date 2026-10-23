import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import units from "./variant-units.json";

/*
  Writes variant.metadata.unit ("adet" | "kg") from the BizimHesap unit of the product with the same code
  (variant SKU = BizimHesap `code`; mapping in variant-units.json, exported from the n8n ERP products table).

  The PS PORT mobile app and the quote flow read metadata.unit to show "600 TL + KDV / adet" or "10.25 $ + KDV / kg".

  SAFE BY DEFAULT:
    - DRY RUN unless APPLY=1 is set: it only logs what it WOULD change.
    - Only touches variants whose SKU is in the mapping and whose metadata.unit is not set yet.
    - Only adet / kg are written. Other BizimHesap units (Kutu, Metre, Metre2) are listed, not written, until
      INCLUDE_OTHER_UNITS=1 (they are written lowercased: kutu, metre, m2).
    - Merges into the existing metadata object; every other metadata key is kept.
    - Nothing is deleted. Revert = remove the "unit" key from metadata (rows are logged with their old metadata).

  Run (inside the Medusa container, after reviewing the dry-run output):
    medusa exec ./src/migration-scripts/set-variant-units.ts            # dry run
    APPLY=1 medusa exec ./src/migration-scripts/set-variant-units.ts    # writes

  NOT YET RUN OR TYPE-CHECKED (written 2026-10-18). Read it fully before running on production.
*/
const MAP: Record<string, string> = {
  Adet: "adet",
  Kilogram: "kg",
};
const OTHER: Record<string, string> = {
  Kutu: "kutu",
  Metre: "metre",
  Metre2: "m2",
};

export default async function set_variant_units({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const productModule = container.resolve(Modules.PRODUCT);

  const apply = process.env.APPLY === "1";
  const includeOther = process.env.INCLUDE_OTHER_UNITS === "1";
  const table = units as Record<string, string>;

  const { data: variants } = await query.graph({
    entity: "product_variant",
    fields: ["id", "sku", "title", "metadata"],
    pagination: { take: 5000 },
  });

  const counts: Record<string, number> = {};
  const skippedOther: string[] = [];
  let already = 0;
  let noMatch = 0;
  const todo: { id: string; sku: string; unit: string; old: Record<string, unknown> }[] = [];

  for (const v of variants as any[]) {
    const code = String(v.sku || "").trim().toUpperCase();
    const erpUnit = table[code];
    if (!erpUnit) {
      noMatch++;
      continue;
    }
    if (v.metadata && v.metadata.unit) {
      already++;
      continue;
    }
    let unit = MAP[erpUnit];
    if (!unit && OTHER[erpUnit]) {
      if (!includeOther) {
        skippedOther.push(`${v.sku} (${erpUnit})`);
        continue;
      }
      unit = OTHER[erpUnit];
    }
    if (!unit) continue;
    counts[unit] = (counts[unit] || 0) + 1;
    todo.push({ id: v.id, sku: v.sku, unit, old: v.metadata || {} });
  }

  logger.info(
    `set-variant-units ${apply ? "APPLY" : "DRY RUN"}: variants=${variants.length}, to write=${todo.length} ${JSON.stringify(counts)}, ` +
      `already set=${already}, no ERP match=${noMatch}, other units not written=${skippedOther.length}`
  );
  if (skippedOther.length) {
    logger.info(`Other units (not written): ${skippedOther.slice(0, 40).join(", ")}${skippedOther.length > 40 ? " ..." : ""}`);
  }

  if (!apply) {
    for (const t of todo.slice(0, 15)) logger.info(`would set ${t.sku} -> ${t.unit}`);
    logger.info("Dry run only - nothing was written. Re-run with APPLY=1 to write.");
    return;
  }

  for (const t of todo) {
    logger.info(`set ${t.sku}: ${t.unit} (old metadata: ${JSON.stringify(t.old)})`);
    await productModule.updateProductVariants(t.id, {
      metadata: { ...t.old, unit: t.unit },
    });
  }
  logger.info(`Done: ${todo.length} variants updated.`);
}
