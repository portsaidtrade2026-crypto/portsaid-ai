import * as fs from "fs";
import * as path from "path";
import { MedusaContainer } from "@medusajs/framework";
import {
  ContainerRegistrationKeys,
  ProductStatus,
} from "@medusajs/framework/utils";
import {
  createProductsWorkflow,
  updateProductsWorkflow,
  uploadFilesWorkflow,
} from "@medusajs/medusa/core-flows";

// Two plastic pallets Ahmed sent as catalogue cards (2026-10-21). Unpriced, so
// they go through the request-a-quote flow like the rest of the catalogue.
// Dry run by default; set APPLY=1 to create. Idempotent by handle.
const ASSETS_DIR = path.resolve(__dirname, "pallet-import-assets");
const CATEGORY_NAME = "Palet";

type Pallet = {
  code: string;
  model: string;
  typeCode: string;
  lengthMm: number;
  weightKg: number;
  weightKgTr: string;
  perTruck: number;
  per40ft: number;
  image: string;
};

const PALLETS: Pallet[] = [
  {
    code: "DPP-1208-NS",
    model: "DPP 1208 NS",
    typeCode: "OD - 9F - PR, SR, WO",
    lengthMm: 1200,
    weightKg: 5.1,
    weightKgTr: "5,1",
    perTruck: 2244,
    per40ft: 1525,
    image: "dpp-1208-ns.webp",
  },
  {
    code: "DPP-11608-NS",
    model: "DPP 11608 NS",
    typeCode: "OD - 9F - SR, WO",
    lengthMm: 1160,
    weightKg: 5,
    weightKgTr: "5",
    perTruck: 2380,
    per40ft: 1830,
    image: "dpp-11608-ns.webp",
  },
];
const WIDTH_MM = 800;
const HEIGHT_MM = 140;
const STATIC_KG = 2000;
const DYNAMIC_KG = 1000;
const PER_STACK_TRUCK = 68;
const PER_STACK_40FT = 61;

const texts = (p: Pallet) => {
  const size = `${p.lengthMm} × ${WIDTH_MM} × ${HEIGHT_MM}`;
  return {
    tr: {
      title: `Plastik Palet ${p.model} — ${size} mm`,
      description: `PE (polietilen) plastik palet, açık güverteli, 9 ayaklı. Ölçü: ${size} mm, ağırlık: ${p.weightKgTr} kg. Statik yük: ${STATIC_KG} kg, dinamik yük: ${DYNAMIC_KG} kg, raf yükü: yok. Tır başına ${p.perTruck} adet (istif başına ${PER_STACK_TRUCK}), 40 ft konteyner başına ${p.per40ft} adet (istif başına ${PER_STACK_40FT}).`,
    },
    en: {
      title: `Plastic Pallet ${p.model} — ${size} mm`,
      description: `PE (polyethylene) plastic pallet, open deck with 9 feet. Size ${size} mm, weight ${p.weightKg} kg. Static load ${STATIC_KG} kg, dynamic load ${DYNAMIC_KG} kg, racking load not applicable. ${p.perTruck} pieces per truck (${PER_STACK_TRUCK} per stack), ${p.per40ft} per 40 ft container (${PER_STACK_40FT} per stack).`,
    },
    bg: {
      title: `Пластмасова палета ${p.model} — ${size} мм`,
      description: `Пластмасова палета от PE (полиетилен), с отворена платформа и 9 крака. Размер ${size} мм, тегло ${p.weightKgTr} кг. Статично натоварване ${STATIC_KG} кг, динамично ${DYNAMIC_KG} кг, натоварване на стелаж – не се прилага. ${p.perTruck} броя на камион (${PER_STACK_TRUCK} в стек), ${p.per40ft} броя на 40-футов контейнер (${PER_STACK_40FT} в стек).`,
    },
    ar: {
      title: `باليت بلاستيك ${p.model} — ${size} مم`,
      description: `باليت بلاستيك من البولي إيثيلين (PE) بسطح مفتوح و9 أرجل. المقاس ${size} مم والوزن ${p.weightKg} كجم. الحمولة الثابتة ${STATIC_KG} كجم والديناميكية ${DYNAMIC_KG} كجم، ولا ينطبق التحميل على الأرفف. ${p.perTruck} قطعة في الشاحنة (${PER_STACK_TRUCK} في الرصة)، و${p.per40ft} قطعة في حاوية 40 قدم (${PER_STACK_40FT} في الرصة).`,
    },
  };
};

export default async function add_plastic_pallets({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const apply = process.env.APPLY === "1";

  const { data: categories } = await query.graph({
    entity: "product_category",
    fields: ["id", "name"],
  });
  const category = (categories as any[]).find(
    (c) => c.name.normalize("NFC") === CATEGORY_NAME
  );
  if (!category) throw new Error(`Category ${CATEGORY_NAME} not found`);

  const { data: existing } = await query.graph({
    entity: "product",
    fields: ["id", "handle", "metadata"],
  });
  const existingHandles = new Set((existing as any[]).map((p) => p.handle));
  const { data: salesChannels } = await query.graph({
    entity: "sales_channel",
    fields: ["id", "name"],
  });
  logger.info(`Sales channel: ${(salesChannels as any[])[0]?.name}`);

  for (const p of PALLETS) {
    const t = texts(p);
    const handle = `plastik-palet-${p.code.toLowerCase()}`;
    const imagePath = path.join(ASSETS_DIR, p.image);
    if (!fs.existsSync(imagePath)) throw new Error(`Missing image ${imagePath}`);
    const found = (existing as any[]).find((x) => x.handle === handle);
    if (found) {
      // Storefront falls back to the English text when a product has no tr
      // entry, so make sure the Turkish copy is stored too.
      const hasTr = !!found.metadata?.translations?.tr;
      logger.info(`${hasTr ? "Skip" : apply ? "Fixing tr translation on" : "Would fix tr translation on"} ${handle}`);
      if (apply && !hasTr) {
        await updateProductsWorkflow(container).run({
          input: {
            selector: { id: found.id },
            update: {
              metadata: {
                ...found.metadata,
                translations: { ...(found.metadata?.translations ?? {}), tr: t.tr },
              },
            },
          },
        });
      }
      continue;
    }
    logger.info(`${apply ? "Creating" : "Would create"} ${handle} -> "${t.tr.title}" in ${CATEGORY_NAME}`);
    if (!apply) continue;

    const { result: uploaded } = await uploadFilesWorkflow(container).run({
      input: {
        files: [
          {
            filename: p.image,
            mimeType: "image/webp",
            content: fs.readFileSync(imagePath).toString("binary"),
            access: "public",
          },
        ],
      },
    });
    const imageUrl = (uploaded as any[])[0]?.url;
    if (!imageUrl) throw new Error(`Upload returned no URL for ${handle}`);

    await createProductsWorkflow(container).run({
      input: {
        products: [
          {
            title: t.tr.title,
            handle,
            description: t.tr.description,
            category_ids: [category.id],
            status: ProductStatus.PUBLISHED,
            images: [{ url: imageUrl }],
            thumbnail: imageUrl,
            material: "PE (Polietilen)",
            weight: Math.round(p.weightKg * 1000),
            length: p.lengthMm,
            width: WIDTH_MM,
            height: HEIGHT_MM,
            options: [{ title: "Default option", values: ["Default option value"] }],
            variants: [
              {
                title: t.tr.title,
                sku: p.code,
                options: { "Default option": "Default option value" },
                manage_inventory: false,
                metadata: { unit: "adet" },
              },
            ],
            metadata: {
              translations: { tr: t.tr, en: t.en, bg: t.bg, ar: t.ar },
              specifications: {
                type_code: p.typeCode,
                static_load_kg: STATIC_KG,
                dynamic_load_kg: DYNAMIC_KG,
                racking_load: "NA",
                pieces_per_truck: p.perTruck,
                pieces_per_stack_truck: PER_STACK_TRUCK,
                pieces_per_40ft: p.per40ft,
                pieces_per_stack_40ft: PER_STACK_40FT,
              },
              source: "pallet_catalogue_cards_2026_10_21",
            },
            sales_channels: (salesChannels as any[])[0]
              ? [{ id: (salesChannels as any[])[0].id }]
              : [],
          },
        ],
      },
    });
    logger.info(`Created ${handle}`);
  }
  if (!apply) logger.info("DRY RUN: nothing created");
}
