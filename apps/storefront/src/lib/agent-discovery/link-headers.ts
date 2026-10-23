// RFC 8288 Link response headers on the home page, so an agent that only fetched "/" learns where the machine-readable
// resources are: the sitemap, the API catalogue (RFC 9727, served by app/.well-known/api-catalog) and the ARD manifest
// (the public MCP server and skill, served by app/.well-known/ard.json).
export const HOME_LINKS = [
  '</sitemap.xml>; rel="sitemap"; type="application/xml"',
  '</.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json"',
  '</.well-known/ard.json>; rel="ard"; type="application/json"',
]

export const homeLinkHeader = () => HOME_LINKS.join(", ")

/** "/" or "/<region>" (optionally with a trailing slash): the pages that count as the home page. */
export function isHomePath(pathname: string, region?: string): boolean {
  const p = pathname.replace(/\/+$/, "") || "/"
  if (p === "/") return true
  return !!region && p.toLowerCase() === `/${region.toLowerCase()}`
}
