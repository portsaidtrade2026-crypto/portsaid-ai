import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { createTaxRatesWorkflow } from "@medusajs/medusa/core-flows";

// add-turkey-region.ts created the "tr" tax region (txreg_...) but never attached a rate to
// it, so every cart/order/quote in the store has calculated 0% tax since the store opened -
// found live when Ahmed noticed a Medusa Admin quote showing no VAT line at all. Turkey's
// standard KDV rate is 20%; this attaches it as the region's DEFAULT rate, which Medusa then
// applies automatically everywhere (carts, checkout, orders, quotes) with no other code
// changes needed - confirmed the quote/order-edit workflows have no pricing logic of their
// own, they just read whatever the core totals calculator (region-driven) produces.
export default async function add_turkey_vat_rate({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const { data: taxRegions } = await query.graph({
    entity: "tax_region",
    fields: ["id", "country_code"],
  });
  const trRegion = (taxRegions as any[]).find((r) => r.country_code === "tr");
  if (!trRegion) {
    logger.error(
      "No 'tr' tax region found - run add-turkey-region.ts first."
    );
    return;
  }

  const { data: existingRates } = await query.graph({
    entity: "tax_rate",
    fields: ["id", "rate", "is_default"],
    filters: { tax_region_id: trRegion.id },
  });
  if ((existingRates as any[]).length > 0) {
    logger.info(
      `Turkey tax region already has ${existingRates.length} rate(s) - skipping.`
    );
    return;
  }

  await createTaxRatesWorkflow(container).run({
    input: [
      {
        tax_region_id: trRegion.id,
        rate: 20,
        code: "KDV-20",
        name: "KDV %20",
        is_default: true,
      },
    ],
  });

  logger.info(`Added 20% KDV default tax rate to Turkey region ${trRegion.id}.`);
}
