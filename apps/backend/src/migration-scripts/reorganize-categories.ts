import * as fs from "fs";
import * as path from "path";
import { MedusaContainer } from "@medusajs/framework";
import {
  ContainerRegistrationKeys,
  ProductStatus,
} from "@medusajs/framework/utils";
import {
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  updateProductCategoriesWorkflow,
} from "@medusajs/medusa/core-flows";

// Restructures the flat 13-category list into Ahmed's requested grouped
// navigation (mega-menu already renders parent/category_children - see
// modules/layout/components/mega-menu/mega-menu.tsx - so this is purely a
// data change, no frontend work needed):
//
//   Ambalaj Malzemeleri (new parent)
//     Endüstriyel/Jumbo/Pre-/Gıda Streç Film, PP Çember, Hotmelt/Akrilik/
//     Maskeleme Bandı, Balonlu Naylon, PE Köpük, Karton Kutu ve Kağıt Çantalar
//   Makineler (new parent)
//     Ambalaj Makineleri
//   Fabrika ve Depo Malzemeleri - stays top-level, no parent
//   Ofis Kırtasiye / Ofis Mobilya / Ofis Temizlik / Kartuş ve Toner - new,
//     empty shells ready for future products ("sonra" per Ahmed)
//
// Also imports the one real product Ahmed has for the new lines: a
// request-quote "Ofis mobilyaları" line item from the prepared catalog
// package (catalog-import/portsaid-assets), unpriced like everything else.
const REPO_ROOT = path.resolve(__dirname, "../../../../");
const ASSETS_DIR = path.join(REPO_ROOT, "catalog-import/portsaid-assets");
const FURNITURE_JSON = path.join(ASSETS_DIR, "data/products.tr.json");

const CHILD_TO_PARENT: Record<string, string> = {
  "Endüstriyel Streç Film": "Ambalaj Malzemeleri",
  "Jumbo Streç Film": "Ambalaj Malzemeleri",
  "Pre-Streç Film": "Ambalaj Malzemeleri",
  "Gıda Streç Film": "Ambalaj Malzemeleri",
  "PP Çember": "Ambalaj Malzemeleri",
  "Hotmelt Koli Bandı": "Ambalaj Malzemeleri",
  "Akrilik Koli Bandı": "Ambalaj Malzemeleri",
  "Maskeleme Bandı": "Ambalaj Malzemeleri",
  "Balonlu Naylon": "Ambalaj Malzemeleri",
  "PE Köpük": "Ambalaj Malzemeleri",
  "Karton Kutu ve Kağıt Çantalar": "Ambalaj Malzemeleri",
  "Ambalaj Makineleri": "Makineler",
};

const NEW_PARENTS = ["Ambalaj Malzemeleri", "Makineler"];
const NEW_EMPTY_SHELLS = [
  "Ofis Kırtasiye",
  "Ofis Mobilya",
  "Ofis Temizlik",
  "Kartuş ve Toner",
];

export default async function reorganize_categories({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const { data: existing } = await query.graph({
    entity: "product_category",
    fields: ["id", "name", "handle", "parent_category_id"],
  });
  const byName = new Map((existing as any[]).map((c) => [c.name, c]));

  // ---- create the new top-level categories (2 real parents + 4 shells) ----
  const toCreate = [...NEW_PARENTS, ...NEW_EMPTY_SHELLS].filter(
    (name) => !byName.has(name)
  );
  if (toCreate.length) {
    const { result: created } = await createProductCategoriesWorkflow(
      container
    ).run({
      input: {
        product_categories: toCreate.map((name) => ({
          name,
          is_active: true,
        })),
      },
    });
    for (const c of created as any[]) byName.set(c.name, c);
    logger.info(`Created ${created.length} new categories: ${toCreate.join(", ")}`);
  } else {
    logger.info("All new categories already exist - skipping creation.");
  }

  // ---- reassign existing categories under their new parent ----
  let reassigned = 0;
  for (const [childName, parentName] of Object.entries(CHILD_TO_PARENT)) {
    const child = byName.get(childName);
    const parent = byName.get(parentName);
    if (!child) {
      logger.info(`Skip: child category "${childName}" not found.`);
      continue;
    }
    if (!parent) {
      logger.info(`Skip: parent category "${parentName}" not found.`);
      continue;
    }
    if (child.parent_category_id === parent.id) continue;
    await updateProductCategoriesWorkflow(container).run({
      input: {
        selector: { id: child.id },
        update: { parent_category_id: parent.id },
      },
    });
    reassigned++;
  }
  logger.info(`Reassigned ${reassigned} categories under their new parent.`);

  // ---- import the one real "Ofis mobilyaları" product, unpriced ----
  const ofisMobilya = byName.get("Ofis Mobilya");
  const { data: existingProducts } = await query.graph({
    entity: "product",
    fields: ["id", "handle"],
  });
  const alreadyImported = (existingProducts as any[]).some(
    (p) => p.handle === "ofis-mobilyalari"
  );

  if (!ofisMobilya) {
    logger.info(`Skip furniture import: "Ofis Mobilya" category missing.`);
  } else if (alreadyImported) {
    logger.info(`"Ofis Mobilyaları" product already exists - skipping.`);
  } else if (!fs.existsSync(FURNITURE_JSON)) {
    logger.info(`Skip furniture import: ${FURNITURE_JSON} not found.`);
  } else {
    const source = JSON.parse(fs.readFileSync(FURNITURE_JSON, "utf8"));
    const furniture = source.products.find(
      (p: any) => p.category === "office-furniture"
    );
    if (!furniture) {
      logger.info(`Skip: no office-furniture entry in ${FURNITURE_JSON}.`);
    } else {
      const { data: salesChannels } = await query.graph({
        entity: "sales_channel",
        fields: ["id", "name"],
      });
      const defaultSalesChannel = salesChannels[0];

      const localImagePath = path.join(ASSETS_DIR, furniture.image);
      const images: { url: string }[] = [];
      if (fs.existsSync(localImagePath)) {
        const { uploadFilesWorkflow } = await import(
          "@medusajs/medusa/core-flows"
        );
        const buffer = fs.readFileSync(localImagePath);
        const { result: uploaded } = await uploadFilesWorkflow(container).run({
          input: {
            files: [
              {
                filename: path.basename(furniture.image),
                mimeType: "image/webp",
                content: buffer.toString("binary"),
                access: "public",
              },
            ],
          },
        });
        const url = (uploaded as any[])[0]?.url;
        if (url) images.push({ url });
      }

      await createProductsWorkflow(container).run({
        input: {
          products: [
            {
              title: "Ofis Mobilyaları",
              handle: "ofis-mobilyalari",
              category_ids: [ofisMobilya.id],
              description: furniture.description,
              status: ProductStatus.DRAFT,
              images,
              thumbnail: images[0]?.url,
              options: [
                { title: "Default option", values: ["Default option value"] },
              ],
              variants: [
                {
                  title: "Ofis Mobilyaları",
                  sku: furniture.id,
                  options: { "Default option": "Default option value" },
                  manage_inventory: false,
                },
              ],
              metadata: {
                translations: {
                  tr: {
                    name: furniture.name,
                    short_description: furniture.short_description,
                    description: furniture.description,
                  },
                },
                source: "portsaid_catalog_import",
              },
              sales_channels: defaultSalesChannel
                ? [{ id: defaultSalesChannel.id }]
                : [],
            },
          ],
        },
      });
      logger.info(`Created "Ofis Mobilyaları" request-quote product.`);
    }
  }
}
