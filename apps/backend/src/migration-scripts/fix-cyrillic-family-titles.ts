import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { updateProductsWorkflow } from "@medusajs/medusa/core-flows";

// One-off fix: 17 of the 122 imported products got a Bulgarian (Cyrillic)
// family_key instead of Turkish - a data bug in the source catalog JSON that
// leaked into the visible product title (e.g. "PP Çember — Чембер Лента
// Черно"). The JSON has already been corrected; this script re-titles the
// already-imported live products to match, WITHOUT touching status, prices,
// images or anything else - a full re-import would reset every product back
// to Draft and undo the bulk-publish that already happened.
//
// Matched by metadata.family_key, which the import script stamped on every
// product with the exact (old, wrong) family_key value - a reliable key,
// unlike title string-matching.

function titleCaseTr(s: string): string {
  return s
    .toLocaleLowerCase("tr-TR")
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toLocaleUpperCase("tr-TR") + w.slice(1))
    .join(" ");
}

function buildProductTitle(categoryName: string, familyKey: string): string {
  const cleanedFamily = familyKey && familyKey !== "GENEL" ? titleCaseTr(familyKey) : "";
  return cleanedFamily ? `${categoryName} — ${cleanedFamily}` : categoryName;
}

const FIX: Record<string, { category: string; newFamilyKey: string }> = {
  "МИКРОНА СТРЕЧ КГ СТАНДАРТНА ШПУЛА": { category: "Endüstriyel Streç Film", newFamilyKey: "İKRON STREÇ KG STANDART MASURA" },
  "МИКРОНА СТРЕЧ ФОЛИО КГ СТАНДАРТЕН ШПУЛА": { category: "Endüstriyel Streç Film", newFamilyKey: "İKRON STREÇ FOLYO KG STANDART MASURA" },
  "МИКРОННА СТРЕЧ СТАНДАРТНА БОБИНА": { category: "Endüstriyel Streç Film", newFamilyKey: "İKRON STREÇ STANDART MASURA" },
  "МИКРОННА СТРЕЧ СУПЕР МОЩНОСТ БОБИНА": { category: "Endüstriyel Streç Film", newFamilyKey: "İKRON STREÇ SUPER POWER MASURA" },
  "МИКРОНА МАШИННО СТРЕЧ ФОЛИО КГ ШПУЛА": { category: "Endüstriyel Streç Film", newFamilyKey: "İKRON MAKİNE STREÇ FOLYO KG MASURA" },
  "МИКРОНА СТРЕЧ ФОЛИО КГ ЧЕРЕН ЦВЯТ ШПУЛА": { category: "Endüstriyel Streç Film", newFamilyKey: "İKRON STREÇ FOLYO KG SİYAH MASURA" },
  "МИКРОННА РЪЧНО СТРЕЧ ФОЛИО БОБИНА": { category: "Endüstriyel Streç Film", newFamilyKey: "İKRON EL STREÇ FOLYO MASURA" },
  "МИКРОННА МАШИНА СТРЕЧ БОБИНА": { category: "Endüstriyel Streç Film", newFamilyKey: "İKRON MAKİNE STREÇ MASURA" },
  "ЧЕМБЕР ЛЕНТА БЯЛО": { category: "PP Çember", newFamilyKey: "ÇEMBER LENTA BEYAZ" },
  "ЧЕМБЕР ЛЕНТА СИНЬО": { category: "PP Çember", newFamilyKey: "ÇEMBER LENTA MAVİ" },
  "ЧЕМБЕР ЛЕНТА ЧЕРНО": { category: "PP Çember", newFamilyKey: "ÇEMBER LENTA SİYAH" },
  "АКРИЛНО ТИКСO38 МИКРОН": { category: "Hotmelt Koli Bandı", newFamilyKey: "AKRİLİK BANT 38 MİKRON" },
  "ТИКСО АКРИЛНО ЕКО СОЛВЕНТ ПРОЗРАЧНО": { category: "Hotmelt Koli Bandı", newFamilyKey: "AKRİLİK BANT EKO SOLVENT ŞEFFAF" },
  "ТИКСО EKO СОЛВЕНТ": { category: "Hotmelt Koli Bandı", newFamilyKey: "BANT EKO SOLVENT" },
  "ТИКСО АКРИЛНО ЖЪЛТО ПРОЗРАЧНО": { category: "Hotmelt Koli Bandı", newFamilyKey: "AKRİLİK BANT SARI ŞEFFAF" },
  "ТИКСО АКРИЛНО ПРОЗРАЧНО": { category: "Hotmelt Koli Bandı", newFamilyKey: "AKRİLİK BANT ŞEFFAF" },
  "ХОТ МЕЛТ ТИКСО МИКРОН": { category: "Hotmelt Koli Bandı", newFamilyKey: "HOTMELT BANT MİKRON" },
};

export default async function fix_cyrillic_family_titles({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "title", "metadata"],
  });

  const updates: { id: string; title: string; metadata: Record<string, any> }[] = [];
  const misses: string[] = [];

  for (const [oldFamilyKey, { category, newFamilyKey }] of Object.entries(FIX)) {
    const match = (products as any[]).find(
      (p) => p.metadata && p.metadata.family_key === oldFamilyKey
    );
    if (!match) {
      misses.push(oldFamilyKey);
      continue;
    }
    updates.push({
      id: match.id,
      title: buildProductTitle(category, newFamilyKey),
      metadata: { ...match.metadata, family_key: newFamilyKey },
    });
  }

  if (updates.length) {
    await updateProductsWorkflow(container).run({
      input: { products: updates },
    });
  }

  logger.info(
    `Retitled ${updates.length} of ${Object.keys(FIX).length} Cyrillic-family products.` +
      (misses.length ? ` No live product matched: ${misses.join(" | ")}` : "")
  );
  for (const u of updates) {
    logger.info(`  ${u.id} -> "${u.title}"`);
  }
}
