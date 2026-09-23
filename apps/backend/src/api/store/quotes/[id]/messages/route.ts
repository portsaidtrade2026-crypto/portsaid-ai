import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework";
import { requireCustomerQuote } from "../../../../../utils/customer-quote";
import { createCustomerQuoteMessageWorkflow } from "../../../../../workflows/quote/workflows/create-quote-message";
import { StoreCreateQuoteMessageType } from "../../validators";

export const POST = async (
  req: AuthenticatedMedusaRequest<StoreCreateQuoteMessageType>,
  res: MedusaResponse
) => {
  const { id } = req.params;
  const customerId = req.auth_context.actor_id;
  await requireCustomerQuote(req.scope, id, customerId);

  await createCustomerQuoteMessageWorkflow(req.scope).run({
    input: {
      ...req.validatedBody,
      customer_id: customerId,
      quote_id: id,
    },
  });

  const quote = await requireCustomerQuote(
    req.scope,
    id,
    customerId,
    req.queryConfig.fields
  );

  res.json({ quote });
};
