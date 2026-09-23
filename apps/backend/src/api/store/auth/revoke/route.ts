import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { bearerToken, tokenDigest, tokenExpiry } from "../../../middlewares/revoked-jwt";
import { jwtRevocationEnabled } from "../../../../config/jwt-revocation";

export async function POST(
  request: AuthenticatedMedusaRequest,
  response: MedusaResponse
): Promise<void> {
  const token = bearerToken(request);
  const expiry = token && tokenExpiry(token);
  if (!token || !expiry || request.auth_context.actor_type !== "customer") {
    response.status(401).json({ message: "Valid customer bearer token required" });
    return;
  }

  if (!jwtRevocationEnabled) {
    // Schema-first release: preserve the previous cookie-only logout behavior
    // without touching a table that may not exist yet. Never claim revocation.
    response.status(200).json({ revoked: false });
    return;
  }

  const db = request.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION);
  await db("revoked_jwt")
    .insert({ id: tokenDigest(token), expires_at: expiry })
    .onConflict("id")
    .ignore();
  // Also prune expired records when a customer logs out. The scheduled job
  // handles periods with no logouts; neither path depends on process memory.
  await db("revoked_jwt").where("expires_at", "<=", db.fn.now()).delete();
  // The storefront SDK parses JSON on success; an empty 204 causes logout
  // to abort before the browser cookie is removed.
  response.status(200).json({ revoked: true });
}