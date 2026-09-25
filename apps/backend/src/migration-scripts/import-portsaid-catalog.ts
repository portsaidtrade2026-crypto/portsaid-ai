import * as fs from "fs";
import * as path from "path";
import { MedusaContainer } from "@medusajs/framework";
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils";
import {
  createProductCategoriesWorkflow,
  createProductOptionsWorkflow,
  createProductsWorkflow,
  deleteProductsWorkflow,
  uploadFilesWorkflow,
} from "@medusajs/medusa/core-flows";

// Repo root is 4 levels up from apps/backend/src/migration-scripts/.
const REPO_ROOT = path.resolve(__dirname, "../../../../");
const CATALOG_JSON = path.join(
  REPO_ROOT,
  "catalog-import/portsaid_catalog_variant_grouped.json"
);
const ASSETS_DIR = path.join(REPO_ROOT, "catalog-import/portsaid-assets");

type CatalogSpec = {
  key: string;
  value: number | string | null;
  unit: string | null;
  labels: Record<string, string | null>;
  is_not_specified?: boolean;
};

type CatalogVariant = {
  variant_id: string;
  slug: string;
  image: string;
  image_alt: Record<string, string>;
  specifications: CatalogSpec[];
  full_name: Record<string, string>;
  publish_status: string;
};

type CatalogOptionAxis = {
  key: string;
  labels: Record<string, string>;
  distinct_value_count: number;
  values: string[];
  suggested_ui_selector: boolean;
};

type CatalogProduct = {
  parent_id: string;
  category: string;
  translations: Record<
    string,
    { name: string; short_description: string; description: string; uses: string[] }
  >;
  option_axes: CatalogOptionAxis[];
  variant_count: number;
  variants: CatalogVariant[];
};

function specValueDisplay(spec: CatalogSpec): string {
  if (spec.is_not_specified) return "Not specified";
  return spec.unit ? `${spec.value} ${spec.unit}` : String(spec.value);
}

export default async function import_portsaid_catalog({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const productModule = container.resolve(Modules.PRODUCT);

  const importLog: Array<Record<string, unknown>> = [];
  const logStep = (entry: Record<string, unknown>) => {
    importLog.push({ at: new Date().toISOString(), ...entry });
  };

  logger.info("Reading prepared catalogue file...");
  if (!fs.existsSync(CATALOG_JSON)) {
    throw new Error(
      `Catalogue file not found at ${CATALOG_JSON}. Pull the content/catalog-import branch (merged into this branch) before running this script.`
    );
  }
  const catalogData: { products: CatalogProduct[] } = JSON.parse(
    fs.readFileSync(CATALOG_JSON, "utf8")
  );
  logger.info(
    `Loaded ${catalogData.products.length} parent products, ` +
      `${catalogData.products.reduce((a, p) => a + p.variant_count, 0)} variants.`
  );

  // ---- Resolve existing store infrastructure (do NOT recreate) ----
  const { data: salesChannels } = await query.graph({
    entity: "sales_channel",
    fields: ["id", "name"],
  });
  const defaultSalesChannel = salesChannels[0];
  if (!defaultSalesChannel) {
    throw new Error(
      "No sales channel found. Run the initial-data-seed script first (store/region/channel bootstrap)."
    );
  }
  logger.info(`Using sales channel: ${defaultSalesChannel.name} (${defaultSalesChannel.id})`);

  // ---- Delete existing placeholder products ----
  const { data: existingProducts } = await query.graph({
    entity: "product",
    fields: ["id", "title"],
  });
  if (existingProducts.length) {
    logger.info(`Deleting ${existingProducts.length} existing (placeholder) products...`);
    await deleteProductsWorkflow(container).run({
      input: { ids: existingProducts.map((p: any) => p.id) },
    });
    logStep({ step: "delete_placeholder_products", count: existingProducts.length });
  }

  // ---- Create categories (Ahmed's 22, from every category referenced in the catalogue) ----
  // Idempotent: categories (unlike products) are not deleted/recreated each
  // run, so re-running this script after a partial failure must not try to
  // recreate a category that already exists from a prior run.
  const categoryNames = [...new Set(catalogData.products.map((p) => p.category))];
  const { data: existingCategories } = await query.graph({
    entity: "product_category",
    fields: ["id", "name"],
  });
  const categoryIdByName = new Map<string, string>(
    existingCategories.map((c: any) => [c.name, c.id])
  );
  const missingCategoryNames = categoryNames.filter((n) => !categoryIdByName.has(n));
  if (missingCategoryNames.length) {
    logger.info(`Creating ${missingCategoryNames.length} new product categories...`);
    const { result: categoryResult } = await createProductCategoriesWorkflow(container).run({
      input: {
        product_categories: missingCategoryNames.map((name) => ({
          name,
          is_active: true,
        })),
      },
    });
    for (const c of categoryResult as any[]) categoryIdByName.set(c.name, c.id);
  }
  logger.info(
    `Categories ready: ${categoryIdByName.size} total (${missingCategoryNames.length} created, ${categoryNames.length - missingCategoryNames.length} reused).`
  );
  logStep({
    step: "create_categories",
    created: missingCategoryNames.length,
    reused: categoryNames.length - missingCategoryNames.length,
  });

  // ---- Create ALL product options ONCE, globally ----
  // Many families share the same axis label (e.g. "Genişlik"/"Kalınlık"/
  // "Uzunluk" appear across dozens of unrelated products), and Medusa product
  // options are catalog-wide, not per-product - creating one per family (as
  // the first run of this script did) fails with "already exists" the second
  // time a shared title comes up. Collect the union of values per title
  // across every family first, then create each option exactly once.
  const globalOptionValuesByTitle = new Map<string, Set<string>>();
  for (const parent of catalogData.products) {
    for (const axis of parent.option_axes.filter((a) => a.suggested_ui_selector)) {
      const title = axis.labels.tr || axis.key;
      if (!globalOptionValuesByTitle.has(title)) globalOptionValuesByTitle.set(title, new Set());
      for (const val of axis.values) globalOptionValuesByTitle.get(title)!.add(val);
    }
  }
  // Medusa still requires at least one option per product; families with no
  // varying axis (single variant, or every axis constant) get a shared
  // "Default option" / "Default option value" pair - the storefront already
  // knows to hide exactly this title/value from the UI (see
  // product-variants-table/index.tsx).
  globalOptionValuesByTitle.set("Default option", new Set(["Default option value"]));

  // Idempotent for the same reason as categories: options can outlive the
  // products that reference them, so a re-run must reuse, not recreate.
  const { data: existingOptions } = await query.graph({
    entity: "product_option",
    fields: ["id", "title", "values.id", "values.value"],
  });
  const globalOptionByTitle = new Map<string, any>(
    existingOptions.map((o: any) => [o.title, o])
  );
  const missingOptionTitles = [...globalOptionValuesByTitle.keys()].filter(
    (t) => !globalOptionByTitle.has(t)
  );
  if (missingOptionTitles.length) {
    logger.info(`Creating ${missingOptionTitles.length} new global product options...`);
    const { result: newOptions } = await createProductOptionsWorkflow(container).run({
      input: {
        product_options: missingOptionTitles.map((title) => ({
          title,
          values: [...globalOptionValuesByTitle.get(title)!],
        })),
      },
    });
    for (const o of newOptions as any[]) globalOptionByTitle.set(o.title, o);
  }
  logger.info(
    `Options ready: ${globalOptionByTitle.size} total (${missingOptionTitles.length} created, reused the rest).`
  );
  logStep({ step: "create_global_options", created: missingOptionTitles.length });

  // ---- Import products ----
  let productsCreated = 0;
  let variantsCreated = 0;
  let imagesUploaded = 0;
  let imagesFailed = 0;
  const productErrors: Array<{ parent_id: string; error: string }> = [];

  for (const parent of catalogData.products) {
    try {
      const selectorAxes = parent.option_axes.filter((a) => a.suggested_ui_selector);
      const usingDefaultOption = selectorAxes.length === 0;

      // Reference the globally-created options (never create per-product).
      const optionIdByAxisKey = new Map(
        selectorAxes.map((axis) => {
          const title = axis.labels.tr || axis.key;
          return [axis.key, globalOptionByTitle.get(title)];
        })
      );
      const valueId = (axisKey: string, value: string): string | undefined => {
        const opt = optionIdByAxisKey.get(axisKey);
        return (opt as any)?.values?.find((v: any) => v.value === value)?.id;
      };
      const defaultOption = globalOptionByTitle.get("Default option");
      const defaultValueId = (defaultOption as any)?.values?.find(
        (v: any) => v.value === "Default option value"
      )?.id;

      // Upload each variant's image, then build the variant payload.
      const variantInputs: any[] = [];
      for (const v of parent.variants) {
        let imageUrl: string | undefined;
        const localPath = path.join(ASSETS_DIR, v.image);
        try {
          if (fs.existsSync(localPath)) {
            const buffer = fs.readFileSync(localPath);
            const { result: uploaded } = await uploadFilesWorkflow(container).run({
              input: {
                files: [
                  {
                    filename: path.basename(v.image),
                    mimeType: "image/webp",
                    content: buffer.toString("base64"),
                    access: "public",
                  },
                ],
              },
            });
            imageUrl = uploaded[0]?.url;
            imagesUploaded++;
          } else {
            logStep({ step: "image_missing", variant_id: v.variant_id, path: localPath });
          }
        } catch (e: any) {
          imagesFailed++;
          logStep({ step: "image_upload_failed", variant_id: v.variant_id, error: String(e?.message || e) });
        }

        const optionValues: Record<string, string> = {};
        if (usingDefaultOption) {
          optionValues["Default option"] = "Default option value";
        } else {
          for (const axis of selectorAxes) {
            const spec = v.specifications.find((s) => s.key === axis.key);
            const display = spec ? specValueDisplay(spec) : "Not specified";
            optionValues[axis.labels.tr || axis.key] = display;
          }
        }

        variantInputs.push({
          title: v.full_name.tr || v.variant_id,
          sku: v.variant_id,
          options: optionValues,
          manage_inventory: false,
          // No `prices`: intentionally left unpriced (request-quote model).
          metadata: {
            specifications: v.specifications,
            source_refs: (v as any).source_refs ?? null,
          },
          ...(imageUrl ? { images: [{ url: imageUrl }] } : {}),
        });
      }

      const trTranslation = parent.translations.tr;
      const categoryId = categoryIdByName.get(parent.category);

      await createProductsWorkflow(container).run({
        input: {
          products: [
            {
              title: trTranslation.name,
              category_ids: categoryId ? [categoryId] : [],
              description: trTranslation.description,
              status: ProductStatus.DRAFT,
              options: usingDefaultOption
                ? [
                    {
                      id: (defaultOption as any).id,
                      value_ids: defaultValueId ? [defaultValueId] : [],
                    },
                  ]
                : selectorAxes.map((axis) => ({
                    id: (optionIdByAxisKey.get(axis.key) as any)!.id,
                    value_ids: axis.values
                      .map((val) => valueId(axis.key, val))
                      .filter((id): id is string => !!id),
                  })),
              variants: variantInputs,
              metadata: {
                translations: parent.translations,
                family_key: parent.family_key,
                source: "portsaid_catalog_import",
              },
              sales_channels: [{ id: defaultSalesChannel.id }],
            },
          ],
        },
      });

      productsCreated++;
      variantsCreated += variantInputs.length;
      logStep({
        step: "product_created",
        parent_id: parent.parent_id,
        category: parent.category,
        variants: variantInputs.length,
      });
    } catch (e: any) {
      productErrors.push({ parent_id: parent.parent_id, error: String(e?.message || e) });
      logStep({ step: "product_failed", parent_id: parent.parent_id, error: String(e?.message || e) });
    }
  }

  const summary = {
    products_attempted: catalogData.products.length,
    products_created: productsCreated,
    variants_created: variantsCreated,
    images_uploaded: imagesUploaded,
    images_failed: imagesFailed,
    product_errors: productErrors,
  };

  logger.info("=== Import summary ===");
  logger.info(JSON.stringify(summary, null, 2));

  const logPath = path.join(REPO_ROOT, "catalog-import", "import-run-log.json");
  fs.writeFileSync(logPath, JSON.stringify({ summary, steps: importLog }, null, 2));
  logger.info(`Full log written to ${logPath}`);

  logger.info(
    "All imported products were created as DRAFT (not published) and with no prices - " +
      "review in the Medusa admin, then publish once ready."
  );
}
