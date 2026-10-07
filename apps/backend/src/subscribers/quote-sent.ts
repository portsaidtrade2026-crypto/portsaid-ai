import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import type { Logger, RemoteQueryFunction } from "@medusajs/framework/types";
import type { QueryQuote } from "../types/quote/query";

/*
  Notifies the n8n automation that a merchant-priced quote was just sent to
  the customer, so it can email (and WhatsApp, where a conversation window
  allows it) the actual priced offer - unlike quote-created.ts, which only
  fires a request acknowledgement. N8N_QUOTE_SENT_WEBHOOK_URL is intentionally
  optional - without it this subscriber is a no-op, same as quote-created.ts.
*/
export default async function quoteSentHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const webhookUrl = process.env.N8N_QUOTE_SENT_WEBHOOK_URL;
  if (!webhookUrl) {
    return;
  }

  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve<RemoteQueryFunction>(
    ContainerRegistrationKeys.QUERY
  );

  const {
    data: [quote],
  } = await query.graph({
    entity: "quote",
    fields: [
      "id",
      "customer.email",
      "customer.first_name",
      "customer.phone",
      "draft_order.total",
      "draft_order.currency_code",
    ],
    filters: { id: data.id },
  });
  const quoteData = quote as unknown as QueryQuote;

  if (!quoteData?.customer?.email) {
    return;
  }

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quote_id: quoteData.id,
        customer_email: quoteData.customer.email,
        customer_name: quoteData.customer.first_name ?? "",
        customer_phone: quoteData.customer.phone ?? "",
        total: quoteData.draft_order?.total ?? null,
        currency_code: quoteData.draft_order?.currency_code ?? null,
      }),
    });
  } catch (error) {
    logger.warn(`Failed to notify n8n of sent quote ${quoteData.id}: ${error}`);
  }
}

export const config: SubscriberConfig = {
  event: "quote.merchant_sent",
};
