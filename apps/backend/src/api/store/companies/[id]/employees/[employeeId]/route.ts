import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import {
  deleteEmployeesWorkflow,
  updateEmployeesWorkflow,
} from "../../../../../../workflows/employee/workflows";
import {
  StoreGetEmployeeParamsType,
  StoreUpdateEmployeeType,
} from "../../../validators";

export const GET = async (
  req: MedusaRequest<StoreGetEmployeeParamsType>,
  res: MedusaResponse
) => {
  const { id, employeeId } = req.params;
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

  const {
    data: [employee],
  } = await query.graph(
    {
      entity: "employee",
      // TODO: fix this
      fields: req.queryConfig.fields,
      filters: {
        ...req.filterableFields,
        id: employeeId,
        company_id: id,
      },
    },
    { throwIfKeyNotFound: true }
  );

  res.json({ employee });
};

export const POST = async (
  req: MedusaRequest<StoreUpdateEmployeeType>,
  res: MedusaResponse
) => {
  const { id, employeeId } = req.params;
  const { spending_limit, is_admin } = req.validatedBody;
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

  const { data: [target] } = await query.graph({
    entity: "employee",
    fields: ["id"],
    filters: { id: employeeId, company_id: id },
  });
  if (!target) {
    return res.status(404).json({ type: "not_found", message: "Employee not found" });
  }

  await updateEmployeesWorkflow.run({
    input: {
      id: employeeId,
      company_id: id,
      spending_limit,
      is_admin,
    },
    container: req.scope,
  });

  const {
    data: [employee],
  } = await query.graph(
    {
      entity: "employee",
      // TODO: fix this
      fields: req.queryConfig.fields,
      filters: {
        ...req.filterableFields,
        id: employeeId,
        company_id: id,
      },
    },
    { throwIfKeyNotFound: true }
  );

  res.json({ employee });
};

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id, employeeId } = req.params;
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const { data: [target] } = await query.graph({
    entity: "employee",
    fields: ["id"],
    filters: { id: employeeId, company_id: id },
  });
  if (!target) {
    return res.status(404).json({ type: "not_found", message: "Employee not found" });
  }

  await deleteEmployeesWorkflow.run({
    input: [employeeId],
    container: req.scope,
  });

  res.json({
    id: employeeId,
    object: "employee",
    deleted: true,
  });
};
