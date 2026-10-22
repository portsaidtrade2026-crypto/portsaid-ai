import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

export default async function check_stationery_status({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  for (const source of [
    "stationery_docx_import_2026_10_03",
    "kartustoner_docx_import_2026_10_03",
    "furniture_supplier_package_2026_10_02",
  ]) {
    const { data: products } = await query.graph({
      entity: "product",
      fields: ["id", "handle", "status", "categories.id", "categories.name", "categories.is_active", "sales_channels.id", "sales_channels.name"],
      filters: { metadata: { source } } as any,
    });
    const byStatus: Record<string, number> = {};
    const catPairs = new Set<string>();
    const scPairs = new Set<string>();
    let noSalesChannel = 0;
    for (const p of products as any[]) {
      byStatus[p.status] = (byStatus[p.status] || 0) + 1;
      for (const c of p.categories || []) catPairs.add(`${c.id}:${c.name}:active=${c.is_active}`);
      for (const sc of p.sales_channels || []) scPairs.add(`${sc.id}:${sc.name}`);
      if (!p.sales_channels?.length) noSalesChannel++;
    }
    logger.info(
      `${source}: total=${(products as any[]).length} byStatus=${JSON.stringify(byStatus)} categories=${JSON.stringify([...catPairs])} salesChannels=${JSON.stringify([...scPairs])} noSalesChannel=${noSalesChannel} sampleHandle=${(products as any[])[0]?.handle}`
    );
  }
}
