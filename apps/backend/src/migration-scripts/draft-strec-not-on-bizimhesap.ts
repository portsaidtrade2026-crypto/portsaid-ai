import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys, ProductStatus } from "@medusajs/framework/utils";
import { updateProductsWorkflow } from "@medusajs/medusa/core-flows";
import targetIds from "./strec-not-on-bizimhesap-ids.json";

// Ahmed asked to clean up every "streç" (stretch film) product that isn't on
// BizimHesap. Comparing the 4 streç categories' SKUs against the current
// BizimHesap /api/b2b/products pull found 58 products (133 variant rows)
// whose SKU is a random "ps-<hex>" id, not a real BizimHesap code - these are
// leftover garbled entries from the original bulk import (titles like
// "Endüstriyel Streç Film — İkron Streç Standart Masura Ith", "İkron" being a
// corrupted "Mikron"), duplicating what the clean BizimHesap-sourced catalog
// already covers. All 58 were still published and live.
//
// Draft (not delete) - same reversible approach used for the earlier demo
// products, so nothing is lost if one of these turns out to matter.
export default async function draft_strec_not_on_bizimhesap({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const { data: allProducts } = await query.graph({
    entity: "product",
    fields: ["id", "status"],
    pagination: { take: 1000, skip: 0 },
  });

  const idSet = new Set(targetIds as string[]);
  const toDraft = (allProducts as any[]).filter(
    (p) => idSet.has(p.id) && p.status !== ProductStatus.DRAFT
  );

  if (!toDraft.length) {
    logger.info("Nothing to do - all target streç products are already draft.");
    return;
  }

  const BATCH = 50;
  let drafted = 0;
  for (let i = 0; i < toDraft.length; i += BATCH) {
    const batch = toDraft.slice(i, i + BATCH);
    await updateProductsWorkflow(container).run({
      input: {
        selector: { id: batch.map((p) => p.id) },
        update: { status: ProductStatus.DRAFT },
      },
    });
    drafted += batch.length;
  }

  logger.info(
    `Set ${drafted} of ${(targetIds as string[]).length} streç-not-on-bizimhesap products to draft.`
  );
}
