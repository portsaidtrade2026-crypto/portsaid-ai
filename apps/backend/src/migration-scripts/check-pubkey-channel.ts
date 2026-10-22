import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

export default async function check_pubkey_channel({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const { data: keys } = await query.graph({
    entity: "api_key",
    fields: ["id", "token", "title", "type", "sales_channels.id", "sales_channels.name"],
    filters: { type: "publishable" } as any,
  });
  for (const k of keys as any[]) {
    logger.info(
      `key ${k.title} token=${k.token} channels=${JSON.stringify((k.sales_channels || []).map((c: any) => `${c.id}:${c.name}`))}`
    );
  }
}
