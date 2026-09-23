// Release-controlled switch. Revision A must be safe against the pre-migration
// database; enable in revision B only after verifying the production schema.
// No environment variable can inadvertently turn revocation on in revision A.
export const jwtRevocationEnabled = false;