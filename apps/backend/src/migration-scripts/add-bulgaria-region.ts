import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import {
  createRegionsWorkflow,
  createTaxRegionsWorkflow,
  createShippingOptionsWorkflow,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows";

// Ahmed (2026-10-11): the store already serves real Bulgarian customers and the storefront's
// own locale mapping (localeFromCountry in lib/i18n/config.ts) has mapped "bg" -> the Bulgarian
// UI for a while - but there was never an actual Medusa region for it, so a bg customer could
// only ever check out against the Turkey/try region. Adds a proper bg/eur region, mirroring
// add-turkey-region.ts. "eur" is the demo seed's original currency and was never actually
// removed from the store's supported_currencies even after the demo Europe region itself was
// deleted (remove-demo-europe-region.ts) - it's real and needed here, not dead weight. Also
// adds "usd" as a second supported currency per Ahmed's separate request, with no region of
// its own for now (just makes a USD price enterable on products/variants).
export default async function add_bulgaria_region({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT);

  const { data: existingRegions } = await query.graph({
    entity: "region",
    fields: ["id", "name", "currency_code"],
  });
  if ((existingRegions as any[]).some((r) => r.currency_code === "eur")) {
    logger.info("A eur-currency region already exists - skipping region creation.");
    return;
  }

  const { data: stores } = await query.graph({
    entity: "store",
    fields: ["id", "supported_currencies.currency_code"],
  });
  const store = stores[0] as any;
  const currentCodes = new Set(
    store.supported_currencies.map((c: any) => c.currency_code)
  );
  const missing = ["eur", "usd"].filter((c) => !currentCodes.has(c));
  if (missing.length) {
    await updateStoresWorkflow(container).run({
      input: {
        selector: { id: store.id },
        update: {
          supported_currencies: [
            ...store.supported_currencies.map((c: any) => ({
              currency_code: c.currency_code,
              is_default: c.is_default,
            })),
            ...missing.map((currency_code) => ({ currency_code, is_default: false })),
          ],
        },
      },
    });
    logger.info(`Added missing store currencies: ${missing.join(", ")}.`);
  }

  logger.info("Creating Bulgaria region...");
  const { result: regionResult } = await createRegionsWorkflow(container).run({
    input: {
      regions: [
        {
          name: "Bulgaria",
          currency_code: "eur",
          countries: ["bg"],
          payment_providers: ["pp_system_default"],
        },
      ],
    },
  });
  const region = regionResult[0];

  await createTaxRegionsWorkflow(container).run({
    input: [{ country_code: "bg", provider_id: "tp_system" }],
  });

  const { data: fulfillmentSets } = await query.graph({
    entity: "fulfillment_set",
    fields: ["id", "service_zones.id", "service_zones.name"],
  });
  const existingSet = (fulfillmentSets as any[])[0];

  if (existingSet) {
    const zone = await fulfillmentModuleService.createServiceZones({
      name: "Bulgaria",
      fulfillment_set_id: existingSet.id,
      geo_zones: [{ country_code: "bg", type: "country" }],
    });

    const { data: shippingProfiles } = await query.graph({
      entity: "shipping_profile",
      fields: ["id"],
    });
    const shippingProfile = (shippingProfiles as any[])[0];

    // Price left at 0 as a placeholder, same as Turkey's own "Standart Kargo" - Ahmed hasn't
    // given a real cross-border shipping cost yet. Update this once he has one.
    await createShippingOptionsWorkflow(container).run({
      input: [
        {
          name: "Standart Kargo",
          price_type: "flat",
          provider_id: "manual_manual",
          service_zone_id: zone.id,
          shipping_profile_id: shippingProfile.id,
          type: {
            label: "Standart",
            description: "Teslimat süresi daha sonra belirlenecek.",
            code: "standard",
          },
          prices: [{ region_id: region.id, amount: 0 }],
          rules: [
            { attribute: "enabled_in_store", value: "true", operator: "eq" },
            { attribute: "is_return", value: "false", operator: "eq" },
          ],
        },
      ],
    });
    logger.info("Added a Bulgaria service zone and shipping option (placeholder price 0).");
  } else {
    logger.info(
      "No fulfillment set found - skipping shipping option (run initial-data-seed first)."
    );
  }

  logger.info(`Bulgaria region ready: ${region.id}`);
}
