import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import {
  createRegionsWorkflow,
  createTaxRegionsWorkflow,
  createShippingOptionsWorkflow,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows";

// The demo seed only ever creates a Europe/EUR region (gb/de/dk/se/fr/es/it),
// but this store's actual market is Turkey - adds a proper try/tr region so
// NEXT_PUBLIC_DEFAULT_REGION=tr (storefront/next.config env) resolves to a
// real region instead of falling back to a European one.
export default async function add_turkey_region({
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
  if ((existingRegions as any[]).some((r) => r.currency_code === "try")) {
    logger.info("A try-currency region already exists - skipping.");
    return;
  }

  const { data: stores } = await query.graph({
    entity: "store",
    fields: ["id", "supported_currencies.currency_code"],
  });
  const store = stores[0] as any;
  const hasTry = store.supported_currencies.some(
    (c: any) => c.currency_code === "try"
  );
  if (!hasTry) {
    await updateStoresWorkflow(container).run({
      input: {
        selector: { id: store.id },
        update: {
          supported_currencies: [
            ...store.supported_currencies.map((c: any) => ({
              currency_code: c.currency_code,
              is_default: c.is_default,
            })),
            { currency_code: "try", is_default: true },
          ],
        },
      },
    });
    logger.info("Added try as a supported store currency (default).");
  }

  logger.info("Creating Turkey region...");
  const { result: regionResult } = await createRegionsWorkflow(container).run({
    input: {
      regions: [
        {
          name: "Turkey",
          currency_code: "try",
          countries: ["tr"],
          payment_providers: ["pp_system_default"],
        },
      ],
    },
  });
  const region = regionResult[0];

  await createTaxRegionsWorkflow(container).run({
    input: [{ country_code: "tr", provider_id: "tp_system" }],
  });

  const { data: fulfillmentSets } = await query.graph({
    entity: "fulfillment_set",
    fields: ["id", "service_zones.id", "service_zones.name"],
  });
  const existingSet = (fulfillmentSets as any[])[0];

  if (existingSet) {
    const zone = await fulfillmentModuleService.createServiceZones({
      name: "Turkey",
      fulfillment_set_id: existingSet.id,
      geo_zones: [{ country_code: "tr", type: "country" }],
    });

    const { data: shippingProfiles } = await query.graph({
      entity: "shipping_profile",
      fields: ["id"],
    });
    const shippingProfile = (shippingProfiles as any[])[0];

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
            description: "2-3 gün içinde teslim.",
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
    logger.info("Added a Turkey service zone and shipping option.");
  } else {
    logger.info(
      "No fulfillment set found - skipping shipping option (run initial-data-seed first)."
    );
  }

  logger.info(`Turkey region ready: ${region.id}`);
}
