import * as fs from "fs";
import * as path from "path";
import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import {
  updateProductsWorkflow,
  uploadFilesWorkflow,
} from "@medusajs/medusa/core-flows";

// Re-uploads every product's images through whichever file provider is
// currently configured (see modules/replit-storage) and updates the live
// product/variant records to point at the new URLs. Needed once, right
// after switching the FILE module from local disk to Replit Object Storage:
// the earlier import runs uploaded to local disk, which isn't shared
// between the dev workspace and the separate production deployment (and
// Autoscale wipes it on every republish anyway), so those URLs are
// dev-only or already broken. Source images are re-read from the
// authoritative, git-committed catalog-import/portsaid-assets/ folder -
// present in any environment after a git pull - not from wherever an
// earlier run happened to store bytes.
//
// Matches live variants back to their source image by SKU (== the
// catalogue's variant_id), since the live records' own metadata.image_url
// is exactly the stale/broken value this script is replacing.
const REPO_ROOT = path.resolve(__dirname, "../../../../");
const CATALOG_JSON = path.join(
  REPO_ROOT,
  "catalog-import/portsaid_catalog_variant_grouped.json"
);
const ASSETS_DIR = path.join(REPO_ROOT, "catalog-import/portsaid-assets");

export default async function reupload_product_images({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const catalog = JSON.parse(fs.readFileSync(CATALOG_JSON, "utf8"));
  const imageBySku = new Map<string, string>();
  for (const parent of catalog.products) {
    for (const v of parent.variants) {
      imageBySku.set(v.variant_id, v.image);
    }
  }

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "title", "variants.id", "variants.sku", "variants.metadata"],
  });

  let productsUpdated = 0;
  let imagesUploaded = 0;
  let imagesFailed = 0;
  const errors: Array<{ product_id: string; error: string }> = [];

  for (const product of products as any[]) {
    try {
      const productImageUrls: string[] = [];
      const variantUpdates: Array<{ id: string; metadata: Record<string, any> }> = [];

      for (const v of product.variants || []) {
        const relImage = v.sku ? imageBySku.get(v.sku) : undefined;
        if (!relImage) continue;

        const localPath = path.join(ASSETS_DIR, relImage);
        if (!fs.existsSync(localPath)) {
          imagesFailed++;
          continue;
        }

        try {
          const buffer = fs.readFileSync(localPath);
          const { result: uploaded } = await uploadFilesWorkflow(container).run({
            input: {
              files: [
                {
                  filename: path.basename(relImage),
                  mimeType: "image/webp",
                  content: buffer.toString("binary"),
                  access: "public",
                },
              ],
            },
          });
          const url = (uploaded as any[])[0]?.url;
          if (url) {
            imagesUploaded++;
            if (!productImageUrls.includes(url)) productImageUrls.push(url);
            variantUpdates.push({
              id: v.id,
              metadata: { ...(v.metadata || {}), image_url: url },
            });
          } else {
            imagesFailed++;
          }
        } catch (e: any) {
          imagesFailed++;
          logger.info(`  image upload failed for sku ${v.sku}: ${String(e?.message || e)}`);
        }
      }

      if (!productImageUrls.length) continue;

      await updateProductsWorkflow(container).run({
        input: {
          products: [
            {
              id: product.id,
              images: productImageUrls.map((url) => ({ url })),
              variants: variantUpdates,
            } as any,
          ],
        },
      });
      productsUpdated++;
    } catch (e: any) {
      errors.push({ product_id: product.id, error: String(e?.message || e) });
    }
  }

  logger.info(
    `Re-upload summary: ${productsUpdated} products updated, ${imagesUploaded} images uploaded, ${imagesFailed} failed, ${errors.length} product errors.`
  );
  if (errors.length) {
    logger.info(`First errors: ${JSON.stringify(errors.slice(0, 5))}`);
  }
}
