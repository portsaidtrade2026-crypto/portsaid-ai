import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { updateProductCategoriesWorkflow } from "@medusajs/medusa/core-flows";

// Ahmed asked to (1) rename "Fabrika ve Depo Malzemeleri" - the catch-all
// bucket the BizimHesap migration used for köşebant/masura/pallet items that
// had no matching category - to "Masura ve Paletler", and (2) sort both the
// top-level categories and the "Ambalaj Malzemeleri" subcategories by how
// many products each one holds (most first), since the nav's current order
// predates this batch of 146 new products and no longer reflects real sizes.
// Top-level sort uses each category's own direct count PLUS its descendants'
// (e.g. "Ambalaj Malzemeleri" itself holds 0 products directly but wraps
// every streç/bandı/çember subcategory) since that's what a shopper actually
// finds under it; subcategory sort uses direct count only.
const RENAME = {
  id: "pcat_01M3FP0Q6M8MFT39VAH2M42MJ4", // Fabrika ve Depo Malzemeleri
  name: "Masura ve Paletler",
};

export default async function rename_and_reorder_categories({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const { data: categories } = await query.graph({
    entity: "product_category",
    fields: ["id", "name", "parent_category_id", "rank", "products.id"],
  });

  const directCount = new Map<string, number>();
  for (const c of categories as any[]) {
    directCount.set(c.id, (c.products ?? []).length);
  }
  const totalCount = new Map<string, number>();
  for (const c of categories as any[]) {
    let total = directCount.get(c.id) ?? 0;
    for (const child of categories as any[]) {
      if (child.parent_category_id === c.id) {
        total += directCount.get(child.id) ?? 0;
      }
    }
    totalCount.set(c.id, total);
  }

  const topLevel = (categories as any[])
    .filter((c) => !c.parent_category_id)
    .sort((a, b) => (totalCount.get(b.id)! - totalCount.get(a.id)!));

  const byParent = new Map<string, any[]>();
  for (const c of categories as any[]) {
    if (!c.parent_category_id) continue;
    const list = byParent.get(c.parent_category_id) ?? [];
    list.push(c);
    byParent.set(c.parent_category_id, list);
  }

  const updates: { id: string; name?: string; rank: number }[] = [];

  topLevel.forEach((c, i) => {
    updates.push({
      id: c.id,
      rank: i,
      ...(c.id === RENAME.id ? { name: RENAME.name } : {}),
    });
    const children = (byParent.get(c.id) ?? []).sort(
      (a, b) => (directCount.get(b.id)! - directCount.get(a.id)!)
    );
    children.forEach((child, j) => updates.push({ id: child.id, rank: j }));
  });

  // updateProductCategoriesWorkflow's selector/update is one shared patch
  // per call, not per-row, so each category needs its own call.
  for (const u of updates) {
    await updateProductCategoriesWorkflow(container).run({
      input: {
        selector: { id: u.id },
        update: { rank: u.rank, ...(u.name ? { name: u.name } : {}) },
      },
    });
  }

  logger.info(
    `Renamed ${RENAME.id} -> "${RENAME.name}". Reordered ${updates.length} categories by product count.`
  );
  logger.info(
    "Top-level order: " +
      topLevel.map((c) => `${c.id === RENAME.id ? RENAME.name : c.name}(${totalCount.get(c.id)})`).join(", ")
  );
}
