import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import type { Logger, RemoteQueryFunction } from "@medusajs/framework/types";
import type { QueryQuote } from "../types/quote/query";

/*
  A second, independent listener on quote.created, alongside quote-created.ts (which only
  sends the customer an acknowledgement email). This one notifies n8n's unified Quote
  Requests inbox (qreq) so a website RFQ is visible there from the moment it's submitted,
  not just once it's priced and sent. N8N_QUOTE_INBOX_WEBHOOK_URL is intentionally optional -
  without it this subscriber is a no-op, same pattern as the other quote subscribers.
*/
export default async function quoteCreatedIngestHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const webhookUrl = process.env.N8N_QUOTE_INBOX_WEBHOOK_URL;
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
    fields: ["id", "customer.email", "customer.first_name"],
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
      }),
    });
  } catch (error) {
    logger.warn(`Failed to notify n8n inbox of quote ${quoteData.id}: ${error}`);
  }
}

export const config: SubscriberConfig = {
  event: "quote.created",
};
