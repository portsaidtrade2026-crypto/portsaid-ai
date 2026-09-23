import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework";
import { requireCustomerQuote } from "../../../../../utils/customer-quote";
import { customerRejectQuoteWorkflow } from "../../../../../workflows/quote/workflows";
import { RejectQuoteType } from "../../validators";

export const POST = async (
  req: AuthenticatedMedusaRequest<RejectQuoteType>,
  res: MedusaResponse
) => {
  const { id } = req.params;
  const customerId = req.auth_context.actor_id;
  await requireCustomerQuote(req.scope, id, customerId);

  await customerRejectQuoteWorkflow(req.scope).run({
    input: {
      quote_id: id,
      customer_id: customerId,
      ...req.validatedBody,
    },
  });

  const quote = await requireCustomerQuote(
    req.scope,
    id,
    customerId,
    req.queryConfig.fields
  );

  return res.json({ quote });
};
