import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  authenticate,
  AuthenticatedMedusaRequest,
  MedusaNextFunction,
  MedusaResponse,
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework";
import { MiddlewareRoute } from "@medusajs/medusa";
import { ensureRole } from "../../middlewares/ensure-role";
import { ApprovalType } from "../../../types/approval";
import { approvalTransformQueryConfig } from "./query-config";
import { StoreGetApprovals, StoreUpdateApproval } from "./validators";

const ensureApprovalType = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) => {
  const { id } = req.params;

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

  const {
    data: [approval],
  } = await query.graph({
    entity: "approval",
    fields: ["type", "cart_id"],
    filters: { id },
  });

  if (!approval) {
    res.status(404).json({ message: "Approval not found" });
    return;
  }

  const approvalType = approval.type as unknown as ApprovalType;

  if (approvalType !== ApprovalType.ADMIN) {
    res.status(403).json({ message: "Forbidden" });
    return;
  }

  const customerId = req.auth_context.app_metadata?.customer_id as
    | string
    | undefined;
  if (!customerId) {
    res.status(403).json({ message: "Forbidden" });
    return;
  }
  const [customerResult, cartResult] = await Promise.all([
    query.graph({
      entity: "customer",
      fields: ["employee.company.id"],
      filters: { id: customerId },
    }),
    query.graph({
      entity: "cart",
      fields: ["company.id"],
      filters: { id: approval.cart_id },
    }),
  ]);
  const customerCompanyId = customerResult.data[0]?.employee?.company?.id;
  const cartCompanyId = cartResult.data[0]?.company?.id;
  if (!cartCompanyId || customerCompanyId !== cartCompanyId) {
    res.status(403).json({ message: "Forbidden" });
    return;
  }

  next();
};

export const storeApprovalsMiddlewares: MiddlewareRoute[] = [
  {
    method: "ALL",
    matcher: "/store/approvals*",
    middlewares: [
      authenticate("customer", ["session", "bearer"]),
      ensureRole("company_admin"),
    ],
  },
  {
    method: ["GET"],
    matcher: "/store/approvals",
    middlewares: [
      validateAndTransformQuery(
        StoreGetApprovals,
        approvalTransformQueryConfig
      ),
    ],
  },
  {
    method: ["POST"],
    matcher: "/store/approvals/:id",
    middlewares: [
      ensureApprovalType,
      validateAndTransformBody(StoreUpdateApproval),
    ],
  },
];
