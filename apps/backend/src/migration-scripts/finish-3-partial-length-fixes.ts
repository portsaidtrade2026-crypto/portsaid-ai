import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { updateProductVariantsWorkflow } from "@medusajs/medusa/core-flows";

// A prior run (apply-safe-spec-corrections.ts) successfully linked "Uzunluk" to these 3
// products with the correct value (confirmed via direct DB check), then failed on the
// variant-count check before telling the variant to actually use it - this just finishes
// that second step. No new option or value is created here; everything referenced already
// exists. Current values below are taken from a live DB read right before this was written,
// not re-queried through an unverified nested relation path.
const TARGETS = [
  {
    handle: "17-mikron-şeffaf-streç-standart-200-m-10-cm",
    options: { "Default option": "Default option value", Genişlik: "10 cm", Kalınlık: "17 Mic", Renk: "Şeffaf", Uzunluk: "200 m" },
  },
  {
    handle: "17-mikron-şeffaf-streç-standart-300-m-10-cm",
    options: { "Default option": "Default option value", Genişlik: "10 cm", Kalınlık: "17 Mic", Renk: "Şeffaf", Uzunluk: "300 m" },
  },
  {
    handle: "23-mikron-siyah-streç-standart-241-kg-300-gr-masura-200-m",
    options: { "Default option": "Default option value", Ağırlık: "2.41 kg", Kalınlık: "23 Mic", "Masura Ağırlığı": "300 gr", Renk: "Siyah", Uzunluk: "200 m" },
  },
];

export default async function finish_3_partial_length_fixes({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  for (const t of TARGETS) {
    const { data: products } = await query.graph({
      entity: "product",
      fields: ["id", "variants.id"],
      filters: { handle: [t.handle] },
    });
    const product = (products as any[])[0];
    if (!product) {
      logger.info(`WARNING - not found: ${t.handle}`);
      continue;
    }
    const variant = product.variants[0];
    await updateProductVariantsWorkflow(container).run({
      input: { product_variants: [{ id: variant.id, options: t.options }] },
    });
    logger.info(`Finished ${t.handle}`);
  }
}
