import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

// Undoes the BizimHesap-sourced part of remove-unstocked-categories.ts: the 13
// published products imported from BizimHesap on 2026-10-01 and the three
// categories that hold them. The 4 draft placeholder products (solvent tape,
// steel strap, garbage bags, kraft bag) and their categories stay deleted.
// Dry run by default; set APPLY=1 to restore.
const PRODUCT_IDS = [
  "prod_01M3W28T2YEWW81PQKJT96GESV", // kırmızı KOLİ
  "prod_01M3W2934WZS5FSGQTE7N1288D", // mavi koli
  "prod_01M3W2941XZJ66YM5N6RTD6EE7", // SADE KIRMIZI KOLİ
  "prod_01M3W294Q235QMFXSG1G58XVKC", // SADE KOLİ 3 kg
  "prod_01M3W2957R37471DKADMKRYTTY", // SADE SİYAH KOLİ
  "prod_01M3W295Q1YF5G5JJB037JKJC0", // SADE TURUNCU KOLİ
  "prod_01M3W2965KM54F0QHWBX170FXN", // siyah KOLİ
  "prod_01M3W2973EHE1604K0S97VE3KG", // turuncu KOLİ
  "prod_01M3W2851BTS4H3WYK7EGXA5BD", // BUKE TOKASI 16MM
  "prod_01M3W285FJ5P1CVRF2D7004YDZ", // BUKLE TOKASI 13MM
  "prod_01M3W285V2ER44ESQJDT39D2NN", // BUKLE TOKASI 19MM
  "prod_01M3W28B4NAAEQVFB7522VW35Q", // ÇEMBER TAŞIMA ARABASI
  "prod_01M3W296MZGED0CKQ9SZYDRWHM", // STRAFOR 100X50X2
];
const CATEGORY_HANDLES = [
  "karton-kutu-ve-kağıt-çantalar",
  "çemberleme-ekipmanları",
  "eps-levha",
];

export default async function restore_bizimhesap_categories({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const productModule: any = container.resolve(Modules.PRODUCT);
  const apply = process.env.APPLY === "1";
  const wanted = new Set(CATEGORY_HANDLES.map((h) => h.normalize("NFC")));

  const deletedProducts = await productModule.listProducts(
    { id: PRODUCT_IDS },
    { withDeleted: true, select: ["id", "title", "deleted_at"] }
  );
  for (const p of deletedProducts) {
    logger.info(`product ${p.id} "${p.title}" deleted_at=${p.deleted_at ?? "no"}`);
  }
  const deletedCats = (
    await productModule.listProductCategories(
      {},
      { withDeleted: true, select: ["id", "name", "handle", "deleted_at"] }
    )
  ).filter(
    (c: any) => wanted.has(String(c.handle).normalize("NFC")) && c.deleted_at
  );
  for (const c of deletedCats) logger.info(`category ${c.id} "${c.name}" deleted`);

  if (!apply) {
    logger.info(
      `DRY RUN: would restore ${deletedProducts.filter((p: any) => p.deleted_at).length} products and ${deletedCats.length} categories`
    );
    return;
  }

  // The product module's category tree repository cannot restore soft-deleted
  // categories (it throws "ProductCategory not found"), so clear deleted_at
  // directly.
  if (deletedCats.length) {
    const pg = container.resolve(ContainerRegistrationKeys.PG_CONNECTION);
    await pg("product_category")
      .whereIn("id", deletedCats.map((c: any) => c.id))
      .update({ deleted_at: null });
  }
  await productModule.restoreProducts(
    deletedProducts.filter((p: any) => p.deleted_at).map((p: any) => p.id)
  );
  logger.info("Restored.");
}
