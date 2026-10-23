import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework";
import { IOrderModuleService } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";
import { requireCustomerQuote } from "../../../../../utils/customer-quote";

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const quote = await requireCustomerQuote(
    req.scope,
    req.params.id,
    req.auth_context.actor_id,
    req.queryConfig.fields
  );

  const orderModuleService: IOrderModuleService = req.scope.resolve(
    Modules.ORDER
  );

  const preview = await orderModuleService.previewOrderChange(
    quote.draft_order_id
  );

  res.status(200).json({
    quote: {
      ...quote,
      order_preview: preview,
    },
  });
};
