import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import type { Logger, RemoteQueryFunction } from "@medusajs/framework/types";

/*
  Notifies the n8n automation of a new quote request so it can send the
  customer an acknowledgement email. N8N_QUOTE_WEBHOOK_URL is intentionally
  optional - without it this subscriber is a no-op, so quote creation never
  depends on n8n being reachable.
*/
export default async function quoteCreatedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const webhookUrl = process.env.N8N_QUOTE_WEBHOOK_URL;
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

  if (!quote?.customer?.email) {
    return;
  }

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quote_id: quote.id,
        customer_email: quote.customer.email,
        customer_name: quote.customer.first_name ?? "",
      }),
    });
  } catch (error) {
    logger.warn(`Failed to notify n8n of quote ${quote.id}: ${error}`);
  }
}

export const config: SubscriberConfig = {
  event: "quote.created",
};
