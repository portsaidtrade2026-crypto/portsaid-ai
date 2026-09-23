import type { MedusaContainer, RemoteQueryFunction } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils";
import type { QueryQuote } from "../types";

/**
 * Use the same ownership rule for store routes and customer workflows.
 * A missing quote and another customer's quote must be indistinguishable.
 */
export async function requireCustomerQuote(
  container: MedusaContainer,
  quoteId: string,
  customerId: string,
  fields: string[] = ["id"]
): Promise<QueryQuote> {
  if (!quoteId || !customerId) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Quote not found");
  }

  const query = container.resolve<RemoteQueryFunction>(ContainerRegistrationKeys.QUERY);
  const { data: [quote] } = await query.graph({
    entity: "quote",
    fields,
    filters: { id: quoteId, customer_id: customerId },
  });

  if (!quote) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Quote not found");
  }
  return quote as unknown as QueryQuote;
}