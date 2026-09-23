import { createHash } from "node:crypto";
import type { NextFunction } from "express";
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

export function bearerToken(request: MedusaRequest): string | null {
  const header = request.headers.authorization;
  // Medusa accepts case-insensitive bearer schemes; the revocation check
  // must recognize every spelling that Medusa will authenticate.
  const match = header?.match(/(\S+)\s+(\S+)/);
  return match?.[1]?.toLowerCase() === "bearer" ? match[2] : null;
}

export function tokenDigest(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function tokenExpiry(token: string): Date | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
    if (!Number.isSafeInteger(payload.exp) || payload.exp <= Date.now() / 1000) {
      return null;
    }
    // Keep the deny record beyond JWT expiry so reasonable differences
    // between the DB clock and API instance clocks cannot revive a token.
    const expiry = new Date(payload.exp * 1000 + 24 * 60 * 60 * 1000);
    return Number.isNaN(expiry.getTime()) ? null : expiry;
  } catch {
    return null;
  }
}

export async function rejectRevokedJwt(
  request: MedusaRequest,
  response: MedusaResponse,
  next: NextFunction
): Promise<void> {
  // A lost response after a committed revoke must not strand the cookie:
  // the authenticated revoke endpoint is intentionally idempotent.
  // Express strips the matched /store* mount from request.path, so use the
  // original path rather than the mount-relative one.
  if (request.method === "POST" && request.originalUrl.split("?")[0] === "/store/auth/revoke") {
    return next();
  }
  const token = bearerToken(request);
  if (!token) return next();

  try {
    const db = request.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION);
    const revoked = await db("revoked_jwt")
      .where({ id: tokenDigest(token) })
      .andWhere("expires_at", ">", db.fn.now())
      .first("id");
    if (revoked) {
      response.status(401).json({ message: "Authentication token has been revoked" });
      return;
    }
    next();
  } catch {
    // A missing table or unavailable database must never make revoked tokens
    // valid again. No process-local cache or fail-open path is used.
    response.status(503).json({ message: "Authentication validation unavailable" });
  }
}