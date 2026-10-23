import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { deleteRegionsWorkflow } from "@medusajs/medusa/core-flows";

// The generic demo seed's Europe/EUR region (gb/de/dk/se/fr/es/it) has
// nothing to do with this store's real Turkish market - leaving it in
// place alongside the real Turkey region caused account/address forms to
// pick it as the default and offer the wrong country list. Safe to drop
// entirely now that the Turkey region covers everything the storefront
// needs.
export default async function remove_demo_europe_region({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const { data: regions } = await query.graph({
    entity: "region",
    fields: ["id", "name"],
  });
  const europe = (regions as any[]).find((r) => r.name === "Europe");
  if (!europe) {
    logger.info("No demo Europe region found - skipping.");
    return;
  }

  await deleteRegionsWorkflow(container).run({ input: { ids: [europe.id] } });
  logger.info(`Deleted demo Europe region (${europe.id}).`);
}
