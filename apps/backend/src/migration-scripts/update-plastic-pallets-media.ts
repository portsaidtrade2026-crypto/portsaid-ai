import * as fs from "fs";
import * as path from "path";
import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import {
  updateProductsWorkflow,
  uploadFilesWorkflow,
} from "@medusajs/medusa/core-flows";

// Replaces the low-resolution catalogue screenshots on the two plastic pallets
// with the manufacturer's (Doğan Plastik) own 3-view renders from
// doganplastik.com, and adds the "nestable" fact from the manufacturer's
// product page to the descriptions. Dry run by default; APPLY=1 to write.
const GALLERY_DIR = path.resolve(__dirname, "pallet-import-assets", "gallery");
const HANDLES: Record<string, string> = {
  "plastik-palet-dpp-1208-ns": "dpp-1208-ns",
  "plastik-palet-dpp-11608-ns": "dpp-11608-ns",
};
const NESTABLE = {
  tr: " İç içe geçebilir; boş dönüşte yer kazandırır.",
  en: " Nestable: empty pallets stack inside each other to save space on the return trip.",
  bg: " Вложима: празните палети се влагат една в друга и пестят място при връщане.",
  ar: " قابلة للتداخل: تدخل الباليتات الفارغة داخل بعضها لتوفير المساحة عند العودة.",
} as const;
const MARKER = "İç içe geçebilir";

export default async function update_plastic_pallets_media({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const apply = process.env.APPLY === "1";

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "handle", "description", "metadata", "images.url"],
    filters: { handle: Object.keys(HANDLES) },
  });
  if ((products as any[]).length !== Object.keys(HANDLES).length) {
    throw new Error(`Expected ${Object.keys(HANDLES).length} products, found ${(products as any[]).length}`);
  }

  for (const p of products as any[]) {
    const stem = HANDLES[p.handle];
    const files = [1, 2, 3].map((n) => path.join(GALLERY_DIR, `${stem}-${n}.webp`));
    for (const f of files) if (!fs.existsSync(f)) throw new Error(`Missing ${f}`);
    const hasNote = String(p.description ?? "").includes(MARKER);
    logger.info(
      `${p.handle}: ${p.images?.length ?? 0} current images -> 3 new views; description ${hasNote ? "already has" : "gets"} nestable note`
    );
    if (!apply) continue;

    const urls: string[] = [];
    for (const f of files) {
      const { result } = await uploadFilesWorkflow(container).run({
        input: {
          files: [
            {
              filename: path.basename(f),
              mimeType: "image/webp",
              content: fs.readFileSync(f).toString("binary"),
              access: "public",
            },
          ],
        },
      });
      const url = (result as any[])[0]?.url;
      if (!url) throw new Error(`Upload failed for ${f}`);
      urls.push(url);
    }

    const translations = { ...(p.metadata?.translations ?? {}) };
    if (!hasNote) {
      for (const loc of ["tr", "en", "bg", "ar"] as const) {
        const entry = { ...(translations[loc] ?? {}) };
        entry.description = `${entry.description ?? ""}${NESTABLE[loc]}`;
        translations[loc] = entry;
      }
    }
    await updateProductsWorkflow(container).run({
      input: {
        selector: { id: p.id },
        update: {
          images: urls.map((url) => ({ url })),
          thumbnail: urls[0],
          ...(hasNote ? {} : { description: `${p.description ?? ""}${NESTABLE.tr}` }),
          metadata: { ...(p.metadata ?? {}), translations, manufacturer: "Doğan Plastik" },
        },
      },
    });
    logger.info(`Updated ${p.handle}`);
  }
  if (!apply) logger.info("DRY RUN: nothing changed");
}
