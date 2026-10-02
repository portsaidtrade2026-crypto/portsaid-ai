import * as fs from "fs";
import * as path from "path";
import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys, ProductStatus } from "@medusajs/framework/utils";
import {
  createProductsWorkflow,
  uploadFilesWorkflow,
} from "@medusajs/medusa/core-flows";

// Ahmed: 69 office-furniture items from "2026_09_10_Fiyat listesi.xlsx", reviewed by him
// against their photos via an Artifact gallery before this ran. No price (matches the
// rest of the unpriced catalog - "Price for request" already the norm here). Category is
// the existing empty "Ofis Mobilya" top-level category. Translated titles (en/bg/ar) are
// registered separately in product-titles.ts, keyed by the same handle used here.
const IMAGES_DIR = path.resolve(__dirname, "../../../../office-furniture-images");
const OFIS_MOBILYA_CATEGORY_ID = "pcat_01M3FP305J0YPYXN2KY0EXWC27";
const SALES_CHANNEL_ID = "sc_01M3FP02XBFQQZX0Z34EQHV8EC";

type Item = {
  no: number;
  sku: string;
  handle: string;
  image_file: string | null;
  title_tr: string;
  title_en: string;
  title_bg: string;
  title_ar: string;
};

export default async function import_office_furniture({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const items: Item[] = JSON.parse(
    fs.readFileSync(path.join(IMAGES_DIR, "translated_items.json"), "utf8")
  ).filter((i: Item) => i.image_file);

  const { data: existing } = await query.graph({
    entity: "product",
    fields: ["id", "handle"],
    filters: { handle: items.map((i) => i.handle) },
  });
  const existingHandles = new Set((existing as any[]).map((p) => p.handle));

  let created = 0, skipped = 0, failed = 0;

  for (const item of items) {
    if (existingHandles.has(item.handle)) {
      skipped++;
      continue;
    }
    try {
      const localPath = path.join(IMAGES_DIR, item.image_file!);
      const buffer = fs.readFileSync(localPath);
      const ext = path.extname(item.image_file!).replace(".", "") || "png";
      const { result: uploaded } = await uploadFilesWorkflow(container).run({
        input: {
          files: [
            {
              filename: item.image_file!,
              mimeType: `image/${ext === "jpg" ? "jpeg" : ext}`,
              content: buffer.toString("base64"),
              access: "public",
            },
          ],
        },
      });
      const imageUrl = uploaded[0]?.url;
      if (!imageUrl) throw new Error("upload returned no url");

      await createProductsWorkflow(container).run({
        input: {
          products: [
            {
              title: item.title_tr,
              handle: item.handle,
              category_ids: [OFIS_MOBILYA_CATEGORY_ID],
              sales_channels: [{ id: SALES_CHANNEL_ID }],
              status: ProductStatus.PUBLISHED,
              images: [{ url: imageUrl }],
              thumbnail: imageUrl,
              options: [
                { title: "Default option", values: ["Default option value"] },
              ],
              variants: [
                {
                  title: item.title_tr,
                  sku: item.sku,
                  options: { "Default option": "Default option value" },
                  manage_inventory: false,
                },
              ],
            },
          ],
        },
      });
      created++;
    } catch (e: any) {
      failed++;
      logger.info(`FAILED ${item.sku} (${item.title_tr}): ${String(e?.message || e)}`);
    }
  }

  logger.info(`Office furniture import: created ${created}, skipped ${skipped} (already existed), failed ${failed}.`);
}
