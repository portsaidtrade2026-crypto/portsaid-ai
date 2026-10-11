import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { createTaxRatesWorkflow } from "@medusajs/medusa/core-flows";

// add-bulgaria-region.ts creates the "bg" tax region but never attaches a rate to it -
// run right after it, in the same deploy, so this store never repeats the Turkey mistake
// (add-turkey-region.ts shipped without add-turkey-vat-rate.ts for a while, so every
// Turkish cart/order/quote calculated 0% tax until Ahmed noticed it live). Bulgaria's
// standard VAT (ДДС) rate is 20%, confirmed current for 2026 after its euro adoption.
export default async function add_bulgaria_vat_rate({
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
  const bgRegion = (taxRegions as any[]).find((r) => r.country_code === "bg");
  if (!bgRegion) {
    logger.error("No 'bg' tax region found - run add-bulgaria-region.ts first.");
    return;
  }

  const { data: existingRates } = await query.graph({
    entity: "tax_rate",
    fields: ["id", "rate", "is_default"],
    filters: { tax_region_id: bgRegion.id },
  });
  if ((existingRates as any[]).length > 0) {
    logger.info(
      `Bulgaria tax region already has ${existingRates.length} rate(s) - skipping.`
    );
    return;
  }

  await createTaxRatesWorkflow(container).run({
    input: [
      {
        tax_region_id: bgRegion.id,
        rate: 20,
        code: "DDS-20",
        name: "ДДС 20%",
        is_default: true,
      },
    ],
  });

  logger.info(`Added 20% ДДС default tax rate to Bulgaria region ${bgRegion.id}.`);
}
