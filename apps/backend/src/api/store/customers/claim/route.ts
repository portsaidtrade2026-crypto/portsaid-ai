import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { claimExistingCustomerWorkflow } from "../../../../workflows/customer/claim-existing-customer";

// Called right after sdk.auth.register() during the storefront's "claim your
// account" flow (see modules/account/components/claim-account), before the
// normal sdk.store.customer.create() call - which would otherwise always
// create a brand new customer, orphaning the bulk-imported record. Requires
// a customer-scoped bearer token (see middlewares.ts), which
// sdk.auth.register() already returns even before any customer is linked.
type ClaimBody = { email?: string };

export async function POST(
  request: AuthenticatedMedusaRequest<ClaimBody>,
  response: MedusaResponse
): Promise<void> {
  const email = request.body?.email?.trim().toLowerCase();
  if (!email) {
    response.status(400).json({ message: "email is required" });
    return;
  }
  if (request.auth_context.actor_type !== "customer") {
    response.status(401).json({ message: "Valid customer bearer token required" });
    return;
  }

  const query = request.scope.resolve(ContainerRegistrationKeys.QUERY);
  const { data: customers } = await query.graph({
    entity: "customer",
    fields: ["id", "email", "has_account"],
    filters: { email },
  });

  const claimable = customers.find((c: any) => !c.has_account);
  if (!claimable) {
    response.status(404).json({
      message: "No existing account found for this email to claim",
    });
    return;
  }

  try {
    await claimExistingCustomerWorkflow(request.scope).run({
      input: {
        authIdentityId: request.auth_context.auth_identity_id,
        customerId: claimable.id,
      },
    });
  } catch (e: any) {
    response.status(409).json({ message: String(e?.message || e) });
    return;
  }

  response.status(200).json({ id: claimable.id });
}
