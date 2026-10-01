import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys, ProductStatus } from "@medusajs/framework/utils";
import { updateProductsWorkflow } from "@medusajs/medusa/core-flows";

// Ahmed spotted "Depolama/Bellek/Renk" (Storage/Memory/Color) filter facets on
// the live site that have nothing to do with packaging - these are Medusa's
// stock demo-store products (laptop, webcam, smartphone, monitor, headset,
// keyboard, mouse, speaker), still published from the original seed and never
// cleaned up by remove-demo-categories.ts (that script targeted categories,
// not these specific products). Two SKU-less "17 Mikron Streç Film" entries
// and one "Streç Film — 300 m" placeholder are the same kind of stray test
// data, duplicating what the BizimHesap sync now covers properly.
//
// Draft (not delete) - reversible, and matches how prior batches in this repo
// have handled anything not 100% certain to be safe to remove outright.
const IDS = [
  "prod_01M3FP03RDJ4Y68TWQSHHTQ2ZS", // 16" Ultra-Slim AI Laptop
  "prod_01M3FP0420HXN87808GXFE2R7H", // 1080p HD Pro Webcam
  "prod_01M3FP0474TQQ26K1H7NX5XCXB", // 6.5" Ultra HD Smartphone
  "prod_01M3FP04BWSWZEH3P564NMRFAE", // 34" QD-OLED Curved Gaming Monitor
  "prod_01M3FP04H9AN1TCRG853ZH8YBW", // Hi-Fi Gaming Headset
  "prod_01M3FP04QSF5046JRJ4S2D3JQS", // Wireless Keyboard
  "prod_01M3FP04WKPRK6YPD35FQ2MMCK", // Wireless Rechargeable Mouse
  "prod_01M3FP0526YV0GK83Z8FJ3DS8H", // Conference Speaker
  "prod_01M3P6S2Z3Y9GDCVXH5JXYBG3D", // 17 Mikron Streç Film 50 cm x 300 m (no SKU, dup)
  "prod_01M3P779MM2PTQ1H9ZV1X3Q3G8", // Streç Film — 300 m (placeholder, already draft)
];

export default async function draft_leftover_demo_products({
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
  const idSet = new Set(IDS);
  const toDraft = (allProducts as any[]).filter(
    (p) => idSet.has(p.id) && p.status !== ProductStatus.DRAFT
  );
  logger.info(
    `Fetched ${allProducts.length} total products. Matched ${toDraft.length} of ${IDS.length} target ids as non-draft.`
  );
  logger.info(`Sample fetched ids: ${(allProducts as any[]).slice(0, 3).map((p) => p.id).join(", ")}`);
  logger.info(`Target id present? ${IDS.map((id) => `${id}:${(allProducts as any[]).some((p) => p.id === id)}`).join(" | ")}`);

  if (!toDraft.length) {
    logger.info("Nothing to do - all target products are already draft.");
    return;
  }

  await updateProductsWorkflow(container).run({
    input: {
      selector: { id: toDraft.map((p) => p.id) },
      update: { status: ProductStatus.DRAFT },
    },
  });

  logger.info(`Set ${toDraft.length} leftover demo/placeholder products to draft.`);
}
