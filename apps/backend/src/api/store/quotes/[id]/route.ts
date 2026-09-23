import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework";
import { requireCustomerQuote } from "../../../../utils/customer-quote";
import { GetQuoteParamsType } from "../validators";

export const GET = async (
  req: AuthenticatedMedusaRequest<GetQuoteParamsType>,
  res: MedusaResponse
) => {
  const quote = await requireCustomerQuote(
    req.scope,
    req.params.id,
    req.auth_context.actor_id,
    req.queryConfig.fields
  );
  res.json({ quote });
};
