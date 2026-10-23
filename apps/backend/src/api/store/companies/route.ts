import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { createCompaniesWorkflow } from "../../../workflows/company/workflows/create-companies";
import { createEmployeesWorkflow } from "../../../workflows/employee/workflows";
import { StoreCreateCompanyType } from "./validators";

export const POST = async (
  req: AuthenticatedMedusaRequest<
    StoreCreateCompanyType | StoreCreateCompanyType[]
  >,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

  const { result: createdCompanies } = await createCompaniesWorkflow.run({
    input: Array.isArray(req.validatedBody)
      ? req.validatedBody.map((company) => ({ ...company }))
      : [{ ...req.validatedBody }],
    container: req.scope,
  });

  for (const company of createdCompanies) {
    await createEmployeesWorkflow.run({
      input: {
        employeeData: {
          company_id: company.id,
          customer_id: req.auth_context.actor_id,
          is_admin: true,
          spending_limit: 0,
        },
        customerId: req.auth_context.actor_id,
      },
      container: req.scope,
    });
  }

  const { data: companies } = await query.graph(
    {
      entity: "companies",
      fields: req.queryConfig.fields,
      filters: { id: createdCompanies.map((company) => company.id) },
    },
    { throwIfKeyNotFound: true }
  );

  res.json({ companies });
};
