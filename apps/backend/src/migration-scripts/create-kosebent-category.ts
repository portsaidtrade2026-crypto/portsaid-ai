import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import {
  createProductCategoriesWorkflow,
  updateProductsWorkflow,
} from "@medusajs/medusa/core-flows";

// Ahmed: the 8 "köşebent" (cardboard/PE edge protector) products were stuck
// inside "Masura ve Paletler" (Spools & Pallets) - the BizimHesap catch-all
// bucket for anything without a real category - which is why their English
// titles wrongly read "Spools & Pallets ..." until the product-titles.ts fix.
// Give them their own subcategory under "Ambalaj Malzemeleri", named by its
// real Turkish term, and move them there.
const AMBALAJ_MALZEMELERI_ID = "pcat_01M3FP3059WQXVGXZ8FB0EZN63";

const KOSEBENT_HANDLES = [
  "karton-köşebent-10-mt-5050-5mm",
  "karton-köşebent-1000-mm-40403",
  "karton-köşebent-1100-mm-40403",
  "karton-köşebent-2-mt-4040-4mm",
  "karton-köşebent-210mt-9595-5mm",
  "karton-köşebent-25-mt-4040-4mm",
  "karton-köşebent-3-mt-5090-4mm",
  "l5-polietilen-mavi-köşebent",
];

export default async function create_kosebent_category({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const { data: existing } = await query.graph({
    entity: "product_category",
    fields: ["id", "name", "parent_category_id", "rank"],
  });
  let category = (existing as any[]).find((c) => c.name === "Köşebent");

  if (!category) {
    const siblingCount = (existing as any[]).filter(
      (c) => c.parent_category_id === AMBALAJ_MALZEMELERI_ID
    ).length;
    const { result: created } = await createProductCategoriesWorkflow(
      container
    ).run({
      input: {
        product_categories: [
          {
            name: "Köşebent",
            parent_category_id: AMBALAJ_MALZEMELERI_ID,
            rank: siblingCount,
            is_active: true,
          },
        ],
      },
    });
    category = (created as any[])[0];
    logger.info(`Created category "Köşebent" (${category.id}) under Ambalaj Malzemeleri.`);
  } else {
    logger.info(`Category "Köşebent" already exists (${category.id}) - reusing.`);
  }

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "title", "handle"],
    filters: { handle: KOSEBENT_HANDLES },
  });

  const found = products as any[];
  const missing = KOSEBENT_HANDLES.filter(
    (h) => !found.some((p) => p.handle === h)
  );
  if (missing.length) {
    logger.info(`WARNING - handles not found: ${missing.join(", ")}`);
  }

  if (found.length) {
    await updateProductsWorkflow(container).run({
      input: {
        selector: { id: found.map((p) => p.id) },
        update: { category_ids: [category.id] },
      },
    });
  }

  logger.info(
    `Moved ${found.length}/${KOSEBENT_HANDLES.length} products into "Köşebent": ` +
      found.map((p) => p.title).join(", ")
  );
}
