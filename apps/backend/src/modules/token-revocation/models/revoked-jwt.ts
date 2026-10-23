import { model } from "@medusajs/framework/utils";

// The primary key is SHA-256 of the complete JWT. Neither the token nor its
// claims are stored, and the key is indexed for constant-time lookups.
export const RevokedJwt = model.define("revoked_jwt", {
  id: model.text().primaryKey(),
  expires_at: model.dateTime(),
});