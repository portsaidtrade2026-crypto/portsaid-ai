import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import {
  createProductCategoriesWorkflow,
  updateProductsWorkflow,
} from "@medusajs/medusa/core-flows";

// Ahmed: split the old "Masura ve Paletler" catch-all into two real
// subcategories under Ambalaj Malzemeleri (matching the Köşebent split),
// one for spool cores ("Masura") and one for pallets ("Palet"). The old
// top-level category is left in place but ends up empty.
const AMBALAJ_MALZEMELERI_ID = "pcat_01M3FP3059WQXVGXZ8FB0EZN63";

const MASURA_SKUS = [
  "PHM-001",
  "PHM-002",
  "PHM-003",
  "PHM-004",
  "PHM-005",
  "PHM-006",
  "PHM-007",
  "PHM-008",
  "PHM-009",
];
const PALET_SKUS = ["PHP-001"];

export default async function split_masura_and_palet_category({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const { data: existing } = await query.graph({
    entity: "product_category",
    fields: ["id", "name", "parent_category_id"],
  });
  const siblingCount = (existing as any[]).filter(
    (c) => c.parent_category_id === AMBALAJ_MALZEMELERI_ID
  ).length;

  const byName = new Map((existing as any[]).map((c) => [c.name, c]));
  const toCreate = ["Masura", "Palet"].filter((n) => !byName.has(n));
  if (toCreate.length) {
    const { result: created } = await createProductCategoriesWorkflow(
      container
    ).run({
      input: {
        product_categories: toCreate.map((name, i) => ({
          name,
          parent_category_id: AMBALAJ_MALZEMELERI_ID,
          rank: siblingCount + i,
          is_active: true,
        })),
      },
    });
    for (const c of created as any[]) byName.set(c.name, c);
    logger.info(`Created categories: ${toCreate.join(", ")}`);
  } else {
    logger.info("Masura/Palet categories already exist - reusing.");
  }

  const masuraCat = byName.get("Masura");
  const paletCat = byName.get("Palet");

  const { data: variants } = await query.graph({
    entity: "product_variant",
    fields: ["sku", "product.id", "product.title"],
    filters: { sku: [...MASURA_SKUS, ...PALET_SKUS] },
  });

  const bySku = new Map((variants as any[]).map((v) => [v.sku, v.product]));

  const masuraProductIds = MASURA_SKUS.map((s) => bySku.get(s)?.id).filter(
    Boolean
  );
  const paletProductIds = PALET_SKUS.map((s) => bySku.get(s)?.id).filter(
    Boolean
  );

  const missing = [...MASURA_SKUS, ...PALET_SKUS].filter((s) => !bySku.has(s));
  if (missing.length) {
    logger.info(`WARNING - SKUs not found: ${missing.join(", ")}`);
  }

  if (masuraProductIds.length) {
    await updateProductsWorkflow(container).run({
      input: {
        selector: { id: masuraProductIds },
        update: { category_ids: [masuraCat.id] },
      },
    });
  }
  if (paletProductIds.length) {
    await updateProductsWorkflow(container).run({
      input: {
        selector: { id: paletProductIds },
        update: { category_ids: [paletCat.id] },
      },
    });
  }

  logger.info(
    `Moved ${masuraProductIds.length}/${MASURA_SKUS.length} products into "Masura", ` +
      `${paletProductIds.length}/${PALET_SKUS.length} into "Palet".`
  );
}
