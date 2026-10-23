import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

export default async function list_category_names({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const { data: categories } = await query.graph({
    entity: "product_category",
    fields: ["id", "name", "parent_category_id"],
  });
  for (const c of categories as any[]) {
    logger.info(`${c.id}\t${c.parent_category_id || "-"}\t${c.name}`);
  }
}
