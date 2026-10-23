import { Module } from "@medusajs/framework/utils";
import TokenRevocationService from "./service";

export const TOKEN_REVOCATION_MODULE = "tokenRevocation";

export default Module(TOKEN_REVOCATION_MODULE, {
  service: TokenRevocationService,
});