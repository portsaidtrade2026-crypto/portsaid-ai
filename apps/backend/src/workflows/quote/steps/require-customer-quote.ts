import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { requireCustomerQuote } from "../../../utils/customer-quote";

export const requireCustomerQuoteStep = createStep(
  "require-customer-quote",
  async (
    input: { quote_id: string; customer_id: string; fields?: string[] },
    { container }
  ) => {
    const quote = await requireCustomerQuote(
      container,
      input.quote_id,
      input.customer_id,
      input.fields ?? ["id"]
    );
    return new StepResponse(quote);
  }
);