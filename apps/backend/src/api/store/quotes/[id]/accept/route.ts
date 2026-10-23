import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework";
import { requireCustomerQuote } from "../../../../../utils/customer-quote";
import { customerAcceptQuoteWorkflow } from "../../../../../workflows/quote/workflows";
import { AcceptQuoteType } from "../../validators";

export const POST = async (
  req: AuthenticatedMedusaRequest<AcceptQuoteType>,
  res: MedusaResponse
) => {
  const { id } = req.params;
  const customerId = req.auth_context.actor_id;

  await requireCustomerQuote(req.scope, id, customerId);

  await customerAcceptQuoteWorkflow(req.scope).run({
    input: {
      ...req.validatedBody,
      quote_id: id,
      customer_id: customerId,
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
