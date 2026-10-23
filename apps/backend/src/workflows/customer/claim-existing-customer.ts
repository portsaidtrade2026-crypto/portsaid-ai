import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk";
import {
  setAuthAppMetadataStep,
  updateCustomersWorkflow,
} from "@medusajs/medusa/core-flows";

// Links a freshly-registered auth identity to an EXISTING customer record
// (one bulk-imported with has_account=false, e.g. from Ahmed's CRM export)
// instead of Medusa's standard registration, which always creates a brand
// new customer and would silently orphan the imported one. See
// setAuthAppMetadataStep's own guard: it throws if that auth identity is
// already linked to a customer, so this can't silently re-link/hijack one
// that's already claimed.
type ClaimExistingCustomerInput = {
  authIdentityId: string;
  customerId: string;
};

export const claimExistingCustomerWorkflow = createWorkflow(
  "claim-existing-customer",
  function (input: ClaimExistingCustomerInput) {
    const authIdentity = setAuthAppMetadataStep({
      authIdentityId: input.authIdentityId,
      actorType: "customer",
      value: input.customerId,
    });

    updateCustomersWorkflow.runAsStep({
      input: {
        selector: { id: input.customerId },
        // Medusa's workflow type omits this module-supported account flag.
        // @ts-expect-error has_account is accepted by the customer module at runtime
        update: { has_account: true },
      },
    });

    return new WorkflowResponse(authIdentity);
  }
);
