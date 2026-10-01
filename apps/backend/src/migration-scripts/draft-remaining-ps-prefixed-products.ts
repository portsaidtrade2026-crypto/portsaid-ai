import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys, ProductStatus } from "@medusajs/framework/utils";
import { updateProductsWorkflow } from "@medusajs/medusa/core-flows";
import targetIds from "./remaining-ps-prefixed-ids.json";

// Same cleanup as draft-strec-not-on-bizimhesap.ts, extended sitewide: 65
// more garbled legacy products (random "ps-<hex>" SKU, broken auto-generated
// titles) outside the streç categories, across Hotmelt Koli Bandı, PP Çember,
// Karton Kutu, Masura ve Paletler, Balonlu Naylon, Maskeleme Bandı, Ambalaj
// Makineleri, Akrilik Koli Bandı, PE Köpük. All were still published.
export default async function draft_remaining_ps_prefixed_products({
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
    logger.info("Nothing to do - all target products are already draft.");
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
    `Set ${drafted} of ${(targetIds as string[]).length} remaining ps-prefixed legacy products to draft.`
  );
}
