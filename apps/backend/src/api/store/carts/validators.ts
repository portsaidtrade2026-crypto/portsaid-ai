import { createSelectParams } from "@medusajs/medusa/api/utils/validators";
import { z } from "@medusajs/framework/zod";

export type GetCartLineItemsBulkParamsType = z.infer<
  typeof GetCartLineItemsBulkParams
>;
export const GetCartLineItemsBulkParams = createSelectParams();

export type StoreAddLineItemsBulkType = z.infer<typeof StoreAddLineItemsBulk>;
export const StoreAddLineItemsBulk = z
  .object({
    line_items: z.array(
      z.object({
        variant_id: z.string(),
        quantity: z.number(),
        // Only ever sent by our own server action, and only for variants
        // that genuinely have no price configured (quote-only products) -
        // it marks the line item as custom-priced so Medusa's cart workflow
        // skips its "variant must have a price" check instead of rejecting
        // the whole request. Real priced variants never send this; Medusa
        // still calculates their price normally.
        unit_price: z.number().optional(),
        is_custom_price: z.boolean().optional(),
      })
    ),
  })
  .strict();
