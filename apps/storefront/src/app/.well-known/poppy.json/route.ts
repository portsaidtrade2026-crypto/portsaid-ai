import { getBaseURL } from "@/lib/util/env"

// Personal Agent Protocol discovery (personalagentprotocol.org/docs/spec#3-discovery): a website-only declaration.
// `web: {}` says "this company has a website that agents browse as an ordinary signed-out visitor" - no agent endpoint, no APIs,
// no sign-in, so there is no `auth` block and no OAuth issuer (the spec only requires `auth` when agent / apis / feedback /
// web.browser_session_endpoint is present). `organization.domain` must be the host that serves the document.
// protocol_version follows the spec text read on 2026-10-21 ("This draft is 0.2"); the isitagentready.com hint says "0.1" - if a
// checker insists on that, it is this one constant.
export const dynamic = "force-static"

const PROTOCOL_VERSION = "0.2"

export function GET() {
  const domain = new URL(getBaseURL()).hostname.replace(/^www\./, "")
  const body = {
    protocol_version: PROTOCOL_VERSION,
    organization: { name: "PORTSAID Plastik", domain },
    web: {},
  }
  return new Response(JSON.stringify(body, null, 2), {
    headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=3600" },
  })
}
