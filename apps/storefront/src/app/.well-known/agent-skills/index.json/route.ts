import { jsonResponse, skillsIndex } from "@/lib/mcp/discovery"

// Agent Skills discovery index (RFC v0.2.0): the one skill below, with the sha256 digest of the exact SKILL.md bytes.
export const dynamic = "force-static"

export const GET = () => jsonResponse(skillsIndex())
