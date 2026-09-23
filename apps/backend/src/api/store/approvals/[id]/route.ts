import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { updateApprovalsWorkflow } from "../../../../workflows/approval/workflows";
import { StoreUpdateApprovalType } from "../validators";

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const { data: [approval] } = await query.graph({
    entity: "approval",
    fields: ["*"],
    filters: { id: req.params.id },
  });
  res.json({ approval });
};

export const POST = async (
  req: AuthenticatedMedusaRequest<StoreUpdateApprovalType>,
  res: MedusaResponse
) => {
  const { customer_id } = req.auth_context.app_metadata as {
    customer_id: string;
  };

  const { id: approvalId } = req.params;
  const { status } = req.validatedBody;

  const { result: approval, errors } = await updateApprovalsWorkflow.run({
    input: {
      status,
      handled_by: customer_id,
      id: approvalId,
    },
    container: req.scope,
  });

  if (errors.length > 0) {
    res.status(400).json({
      message: errors[0].error.message,
      code: "INVALID_DATA",
    });
    return;
  }
  res.json({ approval });
};
