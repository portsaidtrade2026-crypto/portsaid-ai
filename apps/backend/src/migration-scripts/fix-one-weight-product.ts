import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import {
  createAndLinkProductOptionsToProductWorkflow,
  updateProductVariantsWorkflow,
} from "@medusajs/medusa/core-flows";

const PRODUCT_ID = "prod_01M3W2728VVJN7SZSDFNGHFZB1";
const VARIANT_ID = "variant_01M3W272EC54B0J8TFV45RZWJJ";

export default async function fix_one_weight_product({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const { data: options } = await query.graph({
    entity: "product_option",
    fields: ["id", "title", "values.id", "values.value"],
    filters: { title: ["Ağırlık", "Masura Ağırlığı"] },
  });

  const agirlik = (options as any[]).find((o) => o.title === "Ağırlık");
  const masura = (options as any[]).find((o) => o.title === "Masura Ağırlığı");

  const agirlikValueId = agirlik.values.find((v: any) => v.value === "1.68 kg")?.id;

  // Ağırlık is already linked to this product (with the wrong value from an
  // earlier manual test) - just add the right value via update. Masura
  // Ağırlığı isn't linked yet - add the option link plus its value.
  await createAndLinkProductOptionsToProductWorkflow(container).run({
    input: {
      product_id: PRODUCT_ID,
      update: [
        {
          product_option_id: agirlik.id,
          add: agirlikValueId ? [agirlikValueId] : [{ value: "1.68 kg" }],
        },
        { product_option_id: masura.id, add: [{ value: "300 gr" }] },
      ],
    },
  });

  await updateProductVariantsWorkflow(container).run({
    input: {
      product_variants: [
        {
          id: VARIANT_ID,
          options: {
            "Default option": "Default option value",
            Kalınlık: "15 um",
            Uzunluk: "200 m",
            Ağırlık: "1.68 kg",
            "Masura Ağırlığı": "300 gr",
            Renk: "Şeffaf",
          },
        },
      ],
    },
  });

  logger.info("Fixed.");
}
