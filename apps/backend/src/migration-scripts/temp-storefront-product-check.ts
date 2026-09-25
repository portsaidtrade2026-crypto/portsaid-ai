import type { MedusaContainer } from "@medusajs/framework";
import {
  ContainerRegistrationKeys,
  ProductStatus,
} from "@medusajs/framework/utils";
import { updateProductsWorkflow } from "@medusajs/medusa/core-flows";

const PRODUCT_ID = "prod_01M3BMER3RG3T04DVWWJNT8HTJ";
const PRODUCT_HANDLE = "masking-green-48mm-30m";

export default async function temp_storefront_product_check({
  container,
}: {
  container: MedusaContainer;
}) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const loadProduct = async () => {
    const { data } = await query.graph({
      entity: "product",
      fields: ["id", "handle", "title", "status", "thumbnail", "images.url"],
      filters: { id: PRODUCT_ID, handle: PRODUCT_HANDLE },
    });

    if (data.length !== 1) {
      throw new Error(
        `Expected exactly one Development product for ${PRODUCT_HANDLE}; found ${data.length}.`
      );
    }

    return data[0] as {
      id: string;
      handle: string;
      title: string;
      status: string;
      thumbnail: string | null;
      images: Array<{ url: string }> | null;
    };
  };

  const product = await loadProduct();
  const action = process.env.TEMP_PRODUCT_ACTION ?? "inspect";
  console.log(
    JSON.stringify({
      phase: "before",
      id: product.id,
      handle: product.handle,
      title: product.title,
      status: product.status,
      thumbnailPresent: Boolean(product.thumbnail),
      imageCount: product.images?.length ?? 0,
      action,
    })
  );

  if (action === "inspect") return;

  const nextStatus =
    action === "publish"
      ? ProductStatus.PUBLISHED
      : action === "restore"
        ? ProductStatus.DRAFT
        : null;

  if (!nextStatus) {
    throw new Error("TEMP_PRODUCT_ACTION must be inspect, publish, or restore.");
  }

  const allowedCurrentStatus =
    action === "publish" ? ProductStatus.DRAFT : ProductStatus.PUBLISHED;
  if (product.status !== allowedCurrentStatus) {
    throw new Error(
      `Refusing ${action}: expected current status ${allowedCurrentStatus}, found ${product.status}.`
    );
  }

  await updateProductsWorkflow(container).run({
    input: {
      selector: { id: PRODUCT_ID },
      update: { status: nextStatus },
    },
  });

  const updated = await loadProduct();
  if (updated.status !== nextStatus) {
    throw new Error(
      `Status verification failed: expected ${nextStatus}, found ${updated.status}.`
    );
  }

  console.log(
    JSON.stringify({
      phase: "after",
      id: updated.id,
      handle: updated.handle,
      status: updated.status,
    })
  );
}