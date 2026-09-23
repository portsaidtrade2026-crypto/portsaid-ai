import {
  AuthenticatedMedusaRequest,
  MedusaNextFunction,
  MedusaResponse,
} from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

export const ensureCompanyAccess = ({
  adminOnly = false,
  allowBootstrap = false,
}: {
  adminOnly?: boolean;
  allowBootstrap?: boolean;
} = {}) => {
  return async (
    req: AuthenticatedMedusaRequest,
    res: MedusaResponse,
    next: MedusaNextFunction
  ) => {
    const companyId = req.params.id;
    const customerId = req.auth_context.app_metadata?.customer_id as
      | string
      | undefined;
    if (!companyId || !customerId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
    const {
      data: [customer],
    } = await query.graph({
      entity: "customer",
      fields: ["id", "email", "employee.id", "employee.is_admin", "employee.company.id"],
      filters: { id: customerId },
    });

    if (customer?.employee?.company?.id === companyId) {
      if (!adminOnly || customer.employee.is_admin === true) {
        return next();
      }
      return res.status(403).json({ message: "Forbidden" });
    }

    // An unclaimed company needs one initial admin, but never let an existing
    // admin claim a different company just because it has no employees.
    if (allowBootstrap && !customer?.employee) {
      const {
        data: [company],
      } = await query.graph({
        entity: "company",
        fields: ["id", "email", "employees.id"],
        filters: { id: companyId },
      });
      const body = req.body as { customer_id?: string; is_admin?: boolean };
      if (
        company &&
        company.employees?.length === 0 &&
        customer?.email?.toLowerCase() === company.email?.toLowerCase() &&
        body?.customer_id === customerId &&
        body?.is_admin === true
      ) {
        return next();
      }
    }

    return res.status(403).json({ message: "Forbidden" });
  };
};

export const ensureEmployeeInCompany = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const {
    data: [employee],
  } = await query.graph({
    entity: "employee",
    fields: ["id", "company.id"],
    filters: { id: req.params.employeeId },
  });

  if (employee?.company?.id !== req.params.id) {
    return res.status(404).json({ message: "Employee not found" });
  }
  return next();
};

export const ensureRole = (role: string) => {
  return async (
    req: AuthenticatedMedusaRequest,
    res: MedusaResponse,
    next: MedusaNextFunction
  ) => {
    const { auth_identity_id } = req.auth_context;
    const customerId = req.auth_context.app_metadata?.customer_id as
      | string
      | undefined;
    if (!customerId) {
      return res.status(403).json({ message: "Forbidden" });
    }
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
    const { data: [customer] } = await query.graph({
      entity: "customer",
      fields: ["employee.is_admin", "employee.company.id"],
      filters: { id: customerId },
    });

    const {
      data: [providerIdentity],
    } = await query.graph({
      entity: "provider_identity",
      fields: ["id", "user_metadata"],
      filters: { auth_identity_id } as any,
    });

    if (
      providerIdentity?.user_metadata?.role === role &&
      customer?.employee?.is_admin === true &&
      customer.employee.company?.id
    ) {
      return next();
    }

    return res.status(403).json({ message: "Forbidden" });
  };
};
