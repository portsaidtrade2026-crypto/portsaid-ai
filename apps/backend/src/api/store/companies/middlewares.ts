import {
  MiddlewareRoute,
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework";
import { authenticate } from "@medusajs/medusa";
import {
  ensureCompanyAccess,
  ensureEmployeeInCompany,
} from "../../middlewares/ensure-role";
import {
  storeCompanyQueryConfig,
  storeEmployeeQueryConfig,
} from "./query-config";
import {
  StoreCreateCompany,
  StoreCreateEmployee,
  StoreGetCompanyParams,
  StoreGetEmployeeParams,
  StoreUpdateApprovalSettings,
  StoreUpdateEmployee,
} from "./validators";

export const storeCompaniesMiddlewares: MiddlewareRoute[] = [
  /* Company middlewares */
  {
    method: "ALL",
    matcher: "/store/companies*",
    middlewares: [authenticate("customer", ["session", "bearer"])],
  },
  {
    method: ["GET"],
    matcher: "/store/companies",
    middlewares: [
      validateAndTransformQuery(
        StoreGetCompanyParams,
        storeCompanyQueryConfig.list
      ),
    ],
  },
  {
    method: ["POST"],
    matcher: "/store/companies",
    middlewares: [
      validateAndTransformBody(StoreCreateCompany),
      validateAndTransformQuery(
        StoreGetCompanyParams,
        storeCompanyQueryConfig.retrieve
      ),
    ],
  },
  {
    method: ["GET"],
    matcher: "/store/companies/:id",
    middlewares: [
      ensureCompanyAccess(),
      validateAndTransformQuery(
        StoreGetCompanyParams,
        storeCompanyQueryConfig.retrieve
      ),
    ],
  },
  {
    method: ["POST"],
    matcher: "/store/companies/:id",
    middlewares: [
      ensureCompanyAccess({ adminOnly: true }),
      validateAndTransformQuery(
        StoreGetCompanyParams,
        storeCompanyQueryConfig.retrieve
      ),
    ],
  },
  {
    method: ["DELETE"],
    matcher: "/store/companies/:id",
    middlewares: [ensureCompanyAccess({ adminOnly: true })],
  },

  /* Employee middlewares */
  {
    method: ["GET"],
    matcher: "/store/companies/:id/employees",
    middlewares: [
      ensureCompanyAccess(),
      validateAndTransformQuery(
        StoreGetEmployeeParams,
        storeEmployeeQueryConfig.list
      ),
    ],
  },
  {
    method: ["POST"],
    matcher: "/store/companies/:id/employees",
    middlewares: [
      ensureCompanyAccess({ adminOnly: true, allowBootstrap: true }),
      validateAndTransformBody(StoreCreateEmployee),
      validateAndTransformQuery(
        StoreGetEmployeeParams,
        storeEmployeeQueryConfig.list
      ),
    ],
  },
  {
    method: ["GET"],
    matcher: "/store/companies/:id/employees/:employeeId",
    middlewares: [
      ensureCompanyAccess(),
      ensureEmployeeInCompany,
      validateAndTransformQuery(
        StoreGetEmployeeParams,
        storeEmployeeQueryConfig.retrieve
      ),
    ],
  },
  {
    method: ["POST"],
    matcher: "/store/companies/:id/employees/:employeeId",
    middlewares: [
      ensureCompanyAccess({ adminOnly: true }),
      ensureEmployeeInCompany,
      validateAndTransformBody(StoreUpdateEmployee),
      validateAndTransformQuery(
        StoreGetEmployeeParams,
        storeEmployeeQueryConfig.retrieve
      ),
    ],
  },
  {
    method: ["DELETE"],
    matcher: "/store/companies/:id/employees/:employeeId",
    middlewares: [
      ensureCompanyAccess({ adminOnly: true }),
      ensureEmployeeInCompany,
    ],
  },
  {
    method: ["POST"],
    matcher: "/store/companies/:id/approval-settings",
    middlewares: [
      ensureCompanyAccess({ adminOnly: true }),
      validateAndTransformBody(StoreUpdateApprovalSettings),
    ],
  },
];
