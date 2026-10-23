import { createWorkflow, transform, WorkflowResponse } from "@medusajs/framework/workflows-sdk";
import { ModuleCreateQuoteMessage, ModuleQuoteMessage } from "../../../types";
import { createQuoteMessageStep } from "../steps/create-quote-message";
import { requireCustomerQuoteStep } from "../steps/require-customer-quote";

/*
  A workflow that creates messages within a quote. Messages are used as a communication trail
  between the merchant and the customer. The message can also hold an item_id for either of the
  actors to have a conversation around or negotiate upon.
*/
export const createQuoteMessageWorkflow = createWorkflow(
  "create-quote-message",
  function (
    input: ModuleCreateQuoteMessage
  ): WorkflowResponse<ModuleQuoteMessage> {
    return new WorkflowResponse(createQuoteMessageStep(input));
  }
);

// Admin messages keep their separately authorized workflow. Customer messages
// require ownership inside the workflow before a message can be inserted.
export const createCustomerQuoteMessageWorkflow = createWorkflow(
  "create-customer-quote-message",
  function (
    input: ModuleCreateQuoteMessage & { customer_id: string }
  ): WorkflowResponse<ModuleQuoteMessage> {
    const quote = requireCustomerQuoteStep({
      quote_id: input.quote_id,
      customer_id: input.customer_id,
    });
    const message = transform({ input, quote }, ({ input, quote }) => ({
      ...input,
      quote_id: quote.id,
    }));
    return new WorkflowResponse(createQuoteMessageStep(message));
  }
);
