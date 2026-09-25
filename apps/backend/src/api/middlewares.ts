import { allowFields } from "@medusajs/framework/http";
import { defineMiddlewares } from "@medusajs/medusa";
import { adminMiddlewares } from "./admin/middlewares";
import { storeMiddlewares } from "./store/middlewares";
import { authenticate } from "@medusajs/medusa";
import { rejectRevokedJwt } from "./middlewares/revoked-jwt";
import { normalizeLocalMediaUrlsMiddleware } from "./middlewares/normalize-local-media-urls";
import { jwtRevocationEnabled } from "../config/jwt-revocation";

export default defineMiddlewares({
  routes: [
    ...(jwtRevocationEnabled
      ? [
          { matcher: "/store*", middlewares: [rejectRevokedJwt] },
          { matcher: "/admin*", middlewares: [rejectRevokedJwt] },
          { matcher: "/auth*", middlewares: [rejectRevokedJwt] },
        ]
      : []),
    {
      method: "POST",
      matcher: "/store/auth/revoke",
      middlewares: [authenticate("customer", ["bearer"])],
    },
    ...adminMiddlewares,
    ...storeMiddlewares,
    {
      matcher: "/store/customers/me",
      middlewares: [allowFields("employee")],
    },
    {
      matcher: "/store/carts",
      middlewares: [
        allowFields(
          "company",
          "company.approval_settings",
          "approvals",
          "approval_status"
        ),
      ],
    },
    {
      matcher: "/admin*",
      middlewares: [normalizeLocalMediaUrlsMiddleware],
    },
  ],
});
