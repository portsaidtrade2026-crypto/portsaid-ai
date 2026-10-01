import { MedusaContainer } from "@medusajs/framework";
import {
  ContainerRegistrationKeys,
  ProductStatus,
} from "@medusajs/framework/utils";
import {
  createProductsWorkflow,
  uploadFilesWorkflow,
} from "@medusajs/medusa/core-flows";
import productsData from "./remaining-products-data.json";

// Ahmed asked to bring over every remaining BizimHesap product the same way
// the Balonlu Naylon line was done (sync-balonlu-naylon-from-bizimhesap.ts).
// BizimHesap's /api/b2b/products doesn't expose a stable list endpoint we can
// page through live here, so productsData is a point-in-time snapshot (code,
// title, category, photo) pulled from the same API the "BizimHesap Sync" n8n
// workflow calls, filtered to items whose `code` isn't already a Medusa
// variant SKU. BizimHesap's own category field is coarse ("STREÇ FİLM" alone
// covers industrial/jumbo/pre-stretch) so CATEGORY_RULES below re-derives the
// right Medusa category from the title - see the accompanying report for
// which buckets were unambiguous vs. best-guess.
//
// Created as DRAFT (not PUBLISHED like the Balonlu Naylon batch) because this
// batch is 174 items pulled programmatically with messy/inconsistent BizimHesap
// titles (casing, embedded units) - Ahmed should scan the batch in the admin
// and bulk-publish once satisfied, rather than it all going live unreviewed.
const SALES_CHANNEL_ID = "sc_01M3FP02XBFQQZX0Z34EQHV8EC";

const CAT = {
  ENDUSTRIYEL_STREC: "pcat_01M3FP0Q6JAY01E7D1G29FNHNE",
  JUMBO_STREC: "pcat_01M3FP0Q6W35YG1YTQ1E36VR67",
  PRE_STREC: "pcat_01M3FP0Q6ZC7D3Y6FW8DMAG30V",
  GIDA_STREC: "pcat_01M3FP0Q6NMEYEV4Q0G4MFZ3KX",
  AKRILIK_KOLI_BANDI: "pcat_01M3FP0Q76FFHP9RPPAES5AZ5F",
  HOTMELT_KOLI_BANDI: "pcat_01M3FP0Q74EK3CJ76T3HDXWDRS",
  MASKELEME_BANDI: "pcat_01M3FP0Q77EE82215GBS0FF5ZV",
  BALONLU_NAYLON: "pcat_01M3FP0Q6Q9QDE6YDZ188R40JP",
  PP_CEMBER: "pcat_01M3FP0Q70CCAVY4NN8H9P70NB",
  AMBALAJ_MAKINELERI: "pcat_01M3FP0Q6K2J98ETCVWWFFBN7M",
  KARTON_KUTU: "pcat_01M3FP0Q6TF35RYNETWNHPT7RY",
  PE_KOPUK: "pcat_01M3FP0Q6V9XBRVVG3GWDNAMGE",
  FABRIKA_DEPO: "pcat_01M3FP0Q6M8MFT39VAH2M42MJ4",
};

// Checked in order; first match wins. `bizimhesapCategory` narrows which rules
// run per BizimHesap bucket so keyword collisions across buckets can't happen.
const CATEGORY_RULES: {
  bizimhesapCategory?: string;
  titleIncludes?: string[];
  category_id: string;
}[] = [
  { bizimhesapCategory: "GIDA STREÇ", category_id: CAT.GIDA_STREC },
  { bizimhesapCategory: "pat pat", category_id: CAT.BALONLU_NAYLON },
  { bizimhesapCategory: "STREÇ FİLM", titleIncludes: ["JUMBO"], category_id: CAT.JUMBO_STREC },
  { bizimhesapCategory: "STREÇ FİLM", titleIncludes: ["S.POWER", "PRESTRECH", "PRE-STREÇ"], category_id: CAT.PRE_STREC },
  { bizimhesapCategory: "STREÇ FİLM", category_id: CAT.ENDUSTRIYEL_STREC },
  { bizimhesapCategory: "koli band", titleIncludes: ["AKRİLİK"], category_id: CAT.AKRILIK_KOLI_BANDI },
  { bizimhesapCategory: "koli band", titleIncludes: ["MASKELEME"], category_id: CAT.MASKELEME_BANDI },
  { bizimhesapCategory: "koli band", category_id: CAT.HOTMELT_KOLI_BANDI },
  { bizimhesapCategory: "TOKA", category_id: CAT.PP_CEMBER },
  { bizimhesapCategory: "ÇENBER", titleIncludes: ["MAKİNESİ", "ARABASI"], category_id: CAT.AMBALAJ_MAKINELERI },
  { bizimhesapCategory: "ÇENBER", category_id: CAT.PP_CEMBER },
  { bizimhesapCategory: "KÖŞEBANT", category_id: CAT.FABRIKA_DEPO },
  { bizimhesapCategory: "KOLİ", category_id: CAT.KARTON_KUTU },
  { bizimhesapCategory: "masura", category_id: CAT.FABRIKA_DEPO },
  { bizimhesapCategory: "Pallet", category_id: CAT.FABRIKA_DEPO },
  { bizimhesapCategory: "STRAFOR", category_id: CAT.PE_KOPUK },
];

type BizimHesapProduct = {
  code: string;
  title: string;
  category: string;
  photo: string | null;
};

function resolveCategoryId(p: BizimHesapProduct): string | null {
  const titleUpper = p.title.toLocaleUpperCase("tr-TR");
  for (const rule of CATEGORY_RULES) {
    if (rule.bizimhesapCategory && rule.bizimhesapCategory !== p.category) continue;
    if (rule.titleIncludes && !rule.titleIncludes.some((kw) => titleUpper.includes(kw))) continue;
    return rule.category_id;
  }
  return null;
}

function firstPhotoUrl(photoField: string | null): string | null {
  if (!photoField) return null;
  try {
    const parsed = JSON.parse(photoField);
    if (!Array.isArray(parsed) || !parsed.length) return null;
    const cover = parsed.find((p: any) => p.FlCover) || parsed[0];
    return cover?.PhotoUrl || cover?.PhotoUrlOriginal || null;
  } catch {
    return null;
  }
}

export default async function sync_remaining_products_from_bizimhesap({
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

  const items = productsData as BizimHesapProduct[];

  let created = 0;
  let skipped = 0;
  let failed = 0;
  let uncategorized = 0;
  const uncategorizedList: string[] = [];
  const failedList: string[] = [];

  for (const item of items) {
    if (existingSkus.has(item.code)) {
      skipped++;
      continue;
    }

    const category_id = resolveCategoryId(item);
    if (!category_id) {
      uncategorized++;
      uncategorizedList.push(`${item.code} [${item.category}]: ${item.title}`);
      continue;
    }

    const photoUrl = firstPhotoUrl(item.photo);
    if (!photoUrl) {
      uncategorized++;
      uncategorizedList.push(`${item.code} (no photo): ${item.title}`);
      continue;
    }

    try {
      const res = await fetch(photoUrl);
      if (!res.ok) throw new Error(`Image fetch failed: HTTP ${res.status}`);
      const arrBuf = await res.arrayBuffer();
      const buffer = Buffer.from(arrBuf);

      const { result: uploaded } = await uploadFilesWorkflow(container).run({
        input: {
          files: [
            {
              filename: `${item.code}.jpg`,
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
              title: item.title,
              category_ids: [category_id],
              status: ProductStatus.DRAFT,
              images: [{ url }],
              thumbnail: url,
              options: [
                { title: "Default option", values: ["Default option value"] },
              ],
              variants: [
                {
                  title: item.title,
                  sku: item.code,
                  options: { "Default option": "Default option value" },
                  manage_inventory: false,
                },
              ],
              metadata: { source: "bizimhesap_sync", bizimhesap_category: item.category },
              sales_channels: [{ id: SALES_CHANNEL_ID }],
            },
          ],
        },
      });
      created++;
      if (created % 20 === 0) logger.info(`Progress: ${created} created so far...`);
    } catch (err: any) {
      failed++;
      failedList.push(`${item.code}: ${err.message}`);
    }
  }

  logger.info(
    `Remaining products sync done: ${created} created (draft), ${skipped} skipped (existing SKU), ${uncategorized} uncategorized/no-photo, ${failed} failed.`
  );
  if (uncategorizedList.length) {
    logger.info(`Uncategorized/no-photo items:\n${uncategorizedList.join("\n")}`);
  }
  if (failedList.length) {
    logger.info(`Failed items:\n${failedList.join("\n")}`);
  }
}
