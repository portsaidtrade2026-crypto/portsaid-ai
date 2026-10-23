import type { MedusaContainer } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { jwtRevocationEnabled } from "../config/jwt-revocation";

export default async function pruneRevokedJwts(container: MedusaContainer) {
  if (!jwtRevocationEnabled) return;
  const db = container.resolve(ContainerRegistrationKeys.PG_CONNECTION);
  await db("revoked_jwt").where("expires_at", "<=", db.fn.now()).delete();
}

export const config = {
  name: "prune-expired-revoked-jwts",
  schedule: "0 * * * *",
};