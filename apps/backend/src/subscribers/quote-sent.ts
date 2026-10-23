import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import type {
  IOrderModuleService,
  Logger,
  RemoteQueryFunction,
} from "@medusajs/framework/types";
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
      "draft_order_id",
      "customer.email",
      "customer.first_name",
      "customer.phone",
      "draft_order.currency_code",
    ],
    filters: { id: data.id },
  });
  const quoteData = quote as unknown as QueryQuote;

  if (!quoteData?.customer?.email) {
    return;
  }

  // draft_order.total is the ORIGINAL order total from before the merchant's pricing
  // edit - it stays at its pre-edit value (often 0 for a brand-new draft order) until the
  // edit is later confirmed, which doesn't happen at send time. Found live this session: a
  // real sent quote reported total:0 here despite being freshly priced, because the edit
  // was still pending. previewOrderChange is the same call the admin quote page and the
  // customer-facing quote page both already use for their own totals - this now reads the
  // same pending/current total they show, not the stale original one.
  const orderModuleService: IOrderModuleService = container.resolve(
    Modules.ORDER
  );
  const preview = await orderModuleService.previewOrderChange(
    quoteData.draft_order_id
  );

  // Website-sourced quotes are priced entirely in Medusa, so this is the only place that
  // ever sees their real line items - without it the n8n Quote Inbox dashboard (and the
  // factory Telegram message it triggers on approval) has no way to show what's actually
  // being delivered, only a price.
  const itemsSummary = (preview.items ?? [])
    .map((item) => `${item.title} x${item.quantity}`)
    .join(", ");

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quote_id: quoteData.id,
        customer_email: quoteData.customer.email,
        customer_name: quoteData.customer.first_name ?? "",
        customer_phone: quoteData.customer.phone ?? "",
        total: preview.total ?? null,
        currency_code: quoteData.draft_order?.currency_code ?? null,
        items_summary: itemsSummary,
      }),
    });
  } catch (error) {
    logger.warn(`Failed to notify n8n of sent quote ${quoteData.id}: ${error}`);
  }
}

export const config: SubscriberConfig = {
  event: "quote.merchant_sent",
};
