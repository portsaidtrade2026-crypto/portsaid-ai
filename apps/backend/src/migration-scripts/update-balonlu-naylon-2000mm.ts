import * as fs from "fs";
import * as path from "path";
import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import {
  updateProductsWorkflow,
  uploadFilesWorkflow,
} from "@medusajs/medusa/core-flows";

// One-off: Ahmed updated the real photo + name for the 200cm*100m/65gr
// bubble-wrap roll in BizimHesap (source ERP, product code PMBLF-019) and
// asked to carry that name + image over to the matching storefront product,
// which still had a generic stock photo and placeholder title.
const PRODUCT_ID = "prod_01M3FP13Y1VE8TM51DPCDSS7FC";
const NEW_TITLE = "Balonlu Naylon — 200CM*100M 65 GR";
const IMAGE_PATH = path.resolve(__dirname, "../../balonlu-naylon-200cm100m.jpg");

export default async function update_balonlu_naylon_2000mm({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);

  const buffer = fs.readFileSync(IMAGE_PATH);
  const { result: uploaded } = await uploadFilesWorkflow(container).run({
    input: {
      files: [
        {
          filename: "balonlu-naylon-200cm100m.jpg",
          mimeType: "image/jpeg",
          content: buffer.toString("binary"),
          access: "public",
        },
      ],
    },
  });
  const url = (uploaded as any[])[0]?.url;
  if (!url) {
    throw new Error("Image upload failed - no URL returned.");
  }

  await updateProductsWorkflow(container).run({
    input: {
      selector: { id: PRODUCT_ID },
      update: {
        title: NEW_TITLE,
        thumbnail: url,
        images: [{ url }],
      },
    },
  });

  logger.info(`Updated ${PRODUCT_ID}: title="${NEW_TITLE}", image=${url}`);
}
