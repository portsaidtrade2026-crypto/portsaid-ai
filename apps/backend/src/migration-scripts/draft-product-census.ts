import type { MedusaContainer } from "@medusajs/framework";
import {
  ContainerRegistrationKeys,
  ProductStatus,
} from "@medusajs/framework/utils";
import { updateProductsWorkflow } from "@medusajs/medusa/core-flows";

const PAGE_SIZE = 100;

type ProductSummary = {
  id: string;
  handle: string;
  status: string;
  metadata: Record<string, unknown> | null;
  images?: Array<{ id: string }>;
  variants?: Array<{ id: string; prices?: Array<{ id: string }> }>;
};

export default async function draft_product_census({
  container,
}: {
  container: MedusaContainer;
}) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const loadProducts = async () => {
    const products: ProductSummary[] = [];

    for (let skip = 0; ; skip += PAGE_SIZE) {
      const { data } = await query.graph({
        entity: "product",
        fields: [
          "id",
          "handle",
          "status",
          "+metadata",
          "images.id",
          "variants.id",
          "variants.prices.id",
        ],
        pagination: {
          skip,
          take: PAGE_SIZE,
          order: { created_at: "ASC" },
        },
      });

      products.push(...(data as ProductSummary[]));
      if (data.length < PAGE_SIZE) break;
    }

    return products;
  };

  const products = await loadProducts();
  const action = process.env.DRAFT_CENSUS_ACTION ?? "inspect";

  const statusCounts: Record<string, number> = {};
  const sourceCounts: Record<string, number> = {};
  const drafts = products.filter((product) => product.status === "draft");
  const draftFamilies = new Set<string>();
  const draftFamilyCounts = new Map<string, number>();

  for (const product of products) {
    statusCounts[product.status] = (statusCounts[product.status] ?? 0) + 1;
    const source = String(product.metadata?.source ?? "unspecified");
    sourceCounts[source] = (sourceCounts[source] ?? 0) + 1;
  }

  for (const product of drafts) {
    const familyKey = product.metadata?.family_key;
    if (typeof familyKey === "string" && familyKey) {
      draftFamilies.add(familyKey);
      draftFamilyCounts.set(
        familyKey,
        (draftFamilyCounts.get(familyKey) ?? 0) + 1
      );
    }
  }

  const importedDrafts = drafts.filter(
    (product) => product.metadata?.source === "portsaid_catalog_import"
  );
  const duplicateDraftFamilyProductCount = [...draftFamilyCounts.values()].reduce(
    (total, count) => total + Math.max(0, count - 1),
    0
  );

  const summarize = (items: ProductSummary[]) => ({
    environment: "Development",
    totalProducts: items.length,
    statusCounts: items.reduce<Record<string, number>>((counts, product) => {
      counts[product.status] = (counts[product.status] ?? 0) + 1;
      return counts;
    }, {}),
  });

  console.log(
    JSON.stringify({
      ...summarize(products),
      sourceCounts,
      draftProducts: drafts.length,
      importedDraftProducts: importedDrafts.length,
      distinctDraftFamilies: draftFamilies.size,
      duplicateDraftFamilyProductCount,
      draftVariantCount: drafts.reduce(
        (total, product) => total + (product.variants?.length ?? 0),
        0
      ),
      draftPricedVariantCount: drafts.reduce(
        (total, product) =>
          total +
          (product.variants?.filter((variant) => (variant.prices?.length ?? 0) > 0)
            .length ?? 0),
        0
      ),
      draftImageAssociations: drafts.reduce(
        (total, product) => total + (product.images?.length ?? 0),
        0
      ),
      action,
    })
  );

  if (action === "inspect") return;
  if (action !== "publish") {
    throw new Error("DRAFT_CENSUS_ACTION must be inspect or publish.");
  }
  if (products.length !== 122 || drafts.length !== 122) {
    throw new Error(
      `Refusing to publish: expected 122 total draft products, found ${products.length} total and ${drafts.length} drafts.`
    );
  }

  try {
    for (let index = 0; index < drafts.length; index += 1) {
      await updateProductsWorkflow(container).run({
        input: {
          selector: { id: drafts[index].id },
          update: { status: ProductStatus.PUBLISHED },
        },
      });
      if ((index + 1) % 25 === 0 || index + 1 === drafts.length) {
        console.log(`Published ${index + 1}/${drafts.length} draft products.`);
      }
    }

    const updated = await loadProducts();
    const publishedCount = updated.filter(
      (product) => product.status === ProductStatus.PUBLISHED
    ).length;
    const remainingDraftCount = updated.filter(
      (product) => product.status === ProductStatus.DRAFT
    ).length;

    if (
      updated.length !== 122 ||
      publishedCount !== 122 ||
      remainingDraftCount !== 0
    ) {
      throw new Error(
        `Post-publish verification failed: ${publishedCount} published, ${remainingDraftCount} still draft, ${updated.length} total.`
      );
    }

    console.log(
      JSON.stringify({
        phase: "published",
        ...summarize(updated),
        publishedCount,
        remainingDraftCount,
      })
    );
  } catch (error) {
    const current = await loadProducts();
    const productsToRestore = current.filter((product) =>
      drafts.some((draft) => draft.id === product.id && product.status !== ProductStatus.DRAFT)
    );

    for (const product of productsToRestore) {
      await updateProductsWorkflow(container).run({
        input: {
          selector: { id: product.id },
          update: { status: ProductStatus.DRAFT },
        },
      });
    }

    throw error;
  }
}