import { MedusaContainer } from "@medusajs/framework";
import {
  ContainerRegistrationKeys,
  ProductStatus,
} from "@medusajs/framework/utils";
import {
  createProductsWorkflow,
  uploadFilesWorkflow,
} from "@medusajs/medusa/core-flows";

// Ahmed updated the real name + photo for every "pat pat" (bubble wrap)
// product in BizimHesap and asked to bring the rest of the Balonlu Naylon
// line over to the storefront the same way the first one (PMBLF-019,
// 200cm*100m/65gr) was done. The 3 pre-existing "Balonlu Naylon" products
// besides that one are legacy multi-variant blobs from the original catalog
// import that don't map cleanly 1:1 to BizimHesap's distinct SKUs, so rather
// than guess which variant is which (risk of attaching the wrong photo to
// the wrong size), this creates one clean product per remaining BizimHesap
// item - same pattern as the PMBLF-019 fix - and leaves the legacy blobs
// untouched for a separate cleanup pass.
const CATEGORY_ID = "pcat_01M3FP0Q6Q9QDE6YDZ188R40JP"; // Balonlu Naylon
const SALES_CHANNEL_ID = "sc_01M3FP02XBFQQZX0Z34EQHV8EC";

const ITEMS: { sku: string; name: string; photo: string }[] = [
  { sku: "PMBLF-003", name: "Balonlu Naylon -100CM*100M 30 Gr", photo: "https://images.bizimhesap.com/0000217517/9f213b7a5aef4e15b6e87d139b66ec34.jpg" },
  { sku: "PMBLF-001", name: "Balonlu Naylon -100CM*100M 40 GR", photo: "https://images.bizimhesap.com/0000217517/4b6989ce5888430593a3e45f55bd4a5e.jpg" },
  { sku: "PMBLF-004", name: "Balonlu Naylon -100CM*100M 50 GR", photo: "https://images.bizimhesap.com/0000217517/4ef5c787b26d448e9018d2efb8954349.jpg" },
  { sku: "PMBLF-005", name: "Balonlu Naylon -100CM*100M 60 GR", photo: "https://images.bizimhesap.com/0000217517/1b7693c750db40409fe556985607e8e0.jpg" },
  { sku: "PMBLF-009", name: "Balonlu Naylon -100CM*50M 30GR", photo: "https://images.bizimhesap.com/0000217517/594e6a2d6bb847f3994f88b5c1524dc4.jpg" },
  { sku: "PMBLF-006", name: "Balonlu Naylon -100CM*50M 35 GR", photo: "https://images.bizimhesap.com/0000217517/0d44bbfad3e4487ca43e785d07cc540e.jpg" },
  { sku: "PMBLF-002", name: "Balonlu Naylon -100CM*50M 40 GR", photo: "https://images.bizimhesap.com/0000217517/3249a483ec3a4fbcaac8f559deab3e41.jpg" },
  { sku: "PMBLF-007", name: "Balonlu Naylon -100CM*50M 50 GR", photo: "https://images.bizimhesap.com/0000217517/2942b8d7684f43d8a921b88c9b62b615.jpg" },
  { sku: "PMBLF-008", name: "Balonlu Naylon -100CM*50M 60 GR", photo: "https://images.bizimhesap.com/0000217517/73a2902815a74a8385bdcb0ebe32b25a.jpg" },
  { sku: "PMBLF-011", name: "Balonlu Naylon -150CM*100M 30 Gr", photo: "https://images.bizimhesap.com/0000217517/77db096ce57843248b72755a528f8534.jpg" },
  { sku: "PMBLF-015", name: "Balonlu Naylon -150CM*100M 40 GR", photo: "https://images.bizimhesap.com/0000217517/4887e597fd6a454a9e5077b9d899627e.jpg" },
  { sku: "PMBLF-016", name: "Balonlu Naylon -150CM*100M 50 GR", photo: "https://images.bizimhesap.com/0000217517/88d8fa51eaf047909178cdc1e2e1a349.jpg" },
  { sku: "PMBLF-014", name: "Balonlu Naylon -150CM*100M 60 GR", photo: "https://images.bizimhesap.com/0000217517/ec81f9f3eaf342e4acbe0d60a5cc993e.jpg" },
  { sku: "PMBLF-012", name: "Balonlu Naylon -150CM*50M 140 Gr", photo: "https://images.bizimhesap.com/0000217517/b9f0e2541b0545d7a40b790dd76c8e5f.jpg" },
  { sku: "PMBLF-013", name: "Balonlu Naylon -150CM*50M 30 GR", photo: "https://images.bizimhesap.com/0000217517/4a2a11c10a83495eaa93feb6e58a5f7a.jpg" },
  { sku: "PMBLF-010", name: "Balonlu Naylon -150CM*50M 40 GR", photo: "https://images.bizimhesap.com/0000217517/361fe9686aef4076aa36b0d4561c12a2.jpg" },
  { sku: "PMBLF-017", name: "Balonlu Naylon -150CM*50M 60 GR", photo: "https://images.bizimhesap.com/0000217517/b9e3f46fc5b34ef3a0319f4fa0ec8add.jpg" },
  { sku: "PMBLF-018", name: "Balonlu Naylon -150CM*50M 65 GR", photo: "https://images.bizimhesap.com/0000217517/9a3673434f2d4555b6b16c81a01594f7.jpg" },
];

export default async function sync_balonlu_naylon_from_bizimhesap({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const { data: existing } = await query.graph({
    entity: "product",
    fields: ["id", "variants.sku"],
  });
  const existingSkus = new Set(
    (existing as any[]).flatMap((p) =>
      (p.variants ?? []).map((v: any) => v.sku).filter(Boolean)
    )
  );

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const item of ITEMS) {
    if (existingSkus.has(item.sku)) {
      logger.info(`Skip ${item.sku}: a variant with this SKU already exists.`);
      skipped++;
      continue;
    }

    try {
      const res = await fetch(item.photo);
      if (!res.ok) throw new Error(`Image fetch failed: HTTP ${res.status}`);
      const arrBuf = await res.arrayBuffer();
      const buffer = Buffer.from(arrBuf);

      const { result: uploaded } = await uploadFilesWorkflow(container).run({
        input: {
          files: [
            {
              filename: `${item.sku}.jpg`,
              mimeType: "image/jpeg",
              content: buffer.toString("binary"),
              access: "public",
            },
          ],
        },
      });
      const url = (uploaded as any[])[0]?.url;
      if (!url) throw new Error("Upload returned no URL");

      await createProductsWorkflow(container).run({
        input: {
          products: [
            {
              title: item.name,
              category_ids: [CATEGORY_ID],
              status: ProductStatus.PUBLISHED,
              images: [{ url }],
              thumbnail: url,
              options: [
                { title: "Default option", values: ["Default option value"] },
              ],
              variants: [
                {
                  title: item.name,
                  sku: item.sku,
                  options: { "Default option": "Default option value" },
                  manage_inventory: false,
                },
              ],
              metadata: { source: "bizimhesap_sync" },
              sales_channels: [{ id: SALES_CHANNEL_ID }],
            },
          ],
        },
      });
      logger.info(`Created ${item.sku}: ${item.name}`);
      created++;
    } catch (err: any) {
      logger.error(`Failed ${item.sku}: ${err.message}`);
      failed++;
    }
  }

  logger.info(
    `Balonlu Naylon sync done: ${created} created, ${skipped} skipped (existing SKU), ${failed} failed.`
  );
}
