import { MedusaService } from "@medusajs/framework/utils";
import { RevokedJwt } from "./models/revoked-jwt";

class TokenRevocationService extends MedusaService({ RevokedJwt }) {}

export default TokenRevocationService;