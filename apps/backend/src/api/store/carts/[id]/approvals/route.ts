import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { ApprovalStatusType } from "../../../../../types/approval";
import { createApprovalsWorkflow } from "../../../../../workflows/approval/workflows";

export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const { id: cartId } = req.params;
  const { customer_id } = req.auth_context.app_metadata as {
    customer_id: string;
  };
  if (!customer_id) {
    res.status(403).json({ message: "Forbidden" });
    return;
  }
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const [customerResult, cartResult] = await Promise.all([
    query.graph({
      entity: "customer",
      fields: ["employee.company.id"],
      filters: { id: customer_id },
    }),
    query.graph({
      entity: "cart",
      fields: ["company.id"],
      filters: { id: cartId },
    }),
  ]);
  const customerCompanyId = customerResult.data[0]?.employee?.company?.id;
  const cartCompanyId = cartResult.data[0]?.company?.id;
  if (!cartCompanyId || customerCompanyId !== cartCompanyId) {
    res.status(403).json({ message: "Forbidden" });
    return;
  }

  const { result: approvals, errors } = await createApprovalsWorkflow.run({
    input: {
      created_by: customer_id,
      cart_id: cartId,
      status: ApprovalStatusType.PENDING,
    },
    container: req.scope,
    throwOnError: false,
  });

  if (errors.length > 0) {
    res.status(400).json({
      message: errors[0].error.message,
      code: "INVALID_DATA",
    });
    return;
  }

  res.json({ approvals });
};
