import { HttpTypes } from "@medusajs/types"
import { NextRequest, NextResponse } from "next/server"
import { localeFromCountry } from "@/lib/i18n/config"
import { homeLinkHeader, isHomePath } from "@/lib/agent-discovery/link-headers"
import { wantsMarkdown } from "@/lib/agent-discovery/markdown"

const BACKEND_URL =
  process.env.MEDUSA_BACKEND_URL ||
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
  "http://localhost:9000"
const PUBLISHABLE_API_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
const DEFAULT_REGION = process.env.NEXT_PUBLIC_DEFAULT_REGION || "us"

const regionMapCache = {
  regionMap: new Map<string, HttpTypes.StoreRegion>(),
  regionMapUpdated: Date.now(),
}

/** Maps the actual visitor country to the initial UI language, independently of Medusa regions. */
export function resolveLocale(countryCode: string | null | undefined) {
  return localeFromCountry(countryCode)
}

async function getRegionMap(cacheId: string) {
  const { regionMap, regionMapUpdated } = regionMapCache

  if (
    !regionMap.keys().next().value ||
    regionMapUpdated < Date.now() - 3600 * 1000
  ) {
    // Fetch regions from Medusa. We can't use the JS client here because middleware is running on Edge and the client needs a Node environment.
    const { regions } = await fetch(`${BACKEND_URL}/store/regions`, {
      headers: {
        "x-publishable-api-key": PUBLISHABLE_API_KEY!,
      },
      next: {
        revalidate: 3600,
        tags: [`regions-${cacheId}`],
      },
    }).then(async (response) => {
      const json = await response.json()

      if (!response.ok) {
        throw new Error(json.message)
      }

      return json
    })

    if (!regions?.length) {
      throw new Error(
        "No regions found. Please set up regions in your Medusa Admin."
      )
    }

    // Create a map of country codes to regions.
    regions.forEach((region: HttpTypes.StoreRegion) => {
      region.countries?.forEach((c) => {
        regionMapCache.regionMap.set(c.iso_2 ?? "", region)
      })
    })

    regionMapCache.regionMapUpdated = Date.now()
  }

  return regionMapCache.regionMap
}

/**
 * Fetches regions from Medusa and sets the region cookie.
 * @param request
 * @param response
 */
async function getCountryCode(
  request: NextRequest,
  regionMap: Map<string, HttpTypes.StoreRegion | number>
) {
  try {
    let countryCode

    const vercelCountryCode = (
      request.headers.get("x-vercel-ip-country") ||
      request.headers.get("cf-ipcountry")
    )?.toLowerCase()

    const urlCountryCode = request.nextUrl.pathname.split("/")[1]?.toLowerCase()

    if (urlCountryCode && regionMap.has(urlCountryCode)) {
      countryCode = urlCountryCode
    } else if (vercelCountryCode && regionMap.has(vercelCountryCode)) {
      countryCode = vercelCountryCode
    } else if (regionMap.has(DEFAULT_REGION)) {
      countryCode = DEFAULT_REGION
    } else if (regionMap.keys().next().value) {
      countryCode = regionMap.keys().next().value
    }

    return countryCode
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error(
        "Middleware.ts: Error getting the country code. Did you set up regions in your Medusa Admin and define a NEXT_PUBLIC_MEDUSA_BACKEND_URL environment variable?"
      )
    }
  }
}

function getCacheId(request: NextRequest) {
  return request.cookies.get("_medusa_cache_id")?.value ||
    request.nextUrl.searchParams.get("_medusa_cache_id") ||
    crypto.randomUUID()
}

function attachCacheId(request: NextRequest, response: NextResponse, cacheId: string) {
  if (!request.cookies.has("_medusa_cache_id")) {
    response.cookies.set("_medusa_cache_id", cacheId, {
      maxAge: 60 * 60 * 24,
      sameSite: "none",
      secure: true,
      partitioned: true,
    })
  }
  return response
}

// Public catalogue pages an agent may ask for as Markdown (/<region>, store, katalog, categories, collections, products,
// bilgi). Cart, checkout, account and order pages are private and stay HTML-only.
const MARKDOWN_PATH = /^\/[a-z]{2}(?:\/(?:store|katalog)|\/(?:categories|collections|products|bilgi)\/.+)?\/?$/i

/**
 * Middleware to handle region selection and cache id.
 */
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  // Next's account slot chunks only resolve when the dynamic segment and slot
  // names are both literal, rather than partially URL-encoded.
  if (
    pathname.startsWith(
      "/_next/static/chunks/app/%5BcountryCode%5D/(main)/account/"
    ) &&
    pathname.endsWith(".js")
  ) {
    const url = request.nextUrl.clone()
    url.pathname = pathname
      .replace("%5BcountryCode%5D", "[countryCode]")
      .replace(/%40/gi, "@")
    return NextResponse.rewrite(url)
  }
  if (pathname.startsWith("/_next/static/chunks/app/")) {
    return NextResponse.next()
  }

  const searchParams = request.nextUrl.searchParams
  const cartId = searchParams.get("cart_id")
  const checkoutStep = searchParams.get("step")
  const cartIdCookie = request.cookies.get("_medusa_cart_id")
  let redirectUrl = request.nextUrl.href

  // An already-correct country route must never redirect to itself just to set
  // the cache cookie. Attach the cookie to whichever final response we return.
  const cacheId = getCacheId(request)

  const regionMap = await getRegionMap(cacheId)

  const countryCode = regionMap && (await getCountryCode(request, regionMap))

  const urlHasCountryCode =
    countryCode && request.nextUrl.pathname.split("/")[1]?.toLowerCase() === countryCode

  // check if one of the country codes is in the url
  // check if the url is a static asset
  if (request.nextUrl.pathname.includes(".")) {
    return NextResponse.next()
  }

  const redirectPath =
    request.nextUrl.pathname === "/" ? "" : request.nextUrl.pathname

  const queryString = request.nextUrl.search ? request.nextUrl.search : ""
  let response: NextResponse = NextResponse.next()

  // If no country code is set, we redirect to the relevant region.
  if (!urlHasCountryCode && countryCode) {
    redirectUrl = `${request.nextUrl.origin}/${countryCode}${redirectPath}${queryString}`
    response = NextResponse.redirect(`${redirectUrl}`, 307)
  }

  // RFC 8288 Link headers on the home page (also on the redirect from "/", so a client that stops there still gets them)
  if (request.method === "GET" && isHomePath(request.nextUrl.pathname, countryCode)) {
    response.headers.set("Link", homeLinkHeader())
  }

  // Markdown for Agents: `Accept: text/markdown` on a public catalogue page returns the page as Markdown. HTML stays the
  // default, so the same URL answers differently by Accept: caches must key on it.
  if (request.method === "GET" && urlHasCountryCode && MARKDOWN_PATH.test(request.nextUrl.pathname)) {
    if (
      !request.headers.has("x-agent-markdown") &&
      response.headers.get("x-middleware-next") === "1" &&
      wantsMarkdown(request.headers.get("accept"))
    ) {
      // A route handler still sees the ORIGINAL url after a rewrite (the query we would add here is lost), so the
      // page to render travels in a request header.
      const url = request.nextUrl.clone()
      url.pathname = "/api/markdown"
      url.search = ""
      const headers = new Headers(request.headers)
      headers.set("x-agent-md-path", request.nextUrl.pathname + request.nextUrl.search)
      response = NextResponse.rewrite(url, { request: { headers } })
    }
    response.headers.append("Vary", "Accept")
  }

  // If a cart_id is in the params, we set it as a cookie and redirect to the address step.
  if (cartId && !checkoutStep && !cartIdCookie) {
    redirectUrl = `${redirectUrl}&step=address`
    response = NextResponse.redirect(`${redirectUrl}`, 307)
    response.cookies.set("_medusa_cart_id", cartId, { maxAge: 60 * 60 * 24 })
  }

  return attachCacheId(request, response, cacheId)
}

export const config = {
  matcher: [
    // /app, /auth and /admin are reverse-proxied straight to the internal
    // Medusa backend (see app/app, app/auth, app/admin route handlers) so
    // the Admin dashboard is reachable through the published domain -
    // this locale/region middleware must never touch them (it was
    // redirecting bare "/app" to "/dk/app" and 404ing, since only paths
    // with a literal "." in them were otherwise exempted).
    // /mcp is the public MCP endpoint (app/mcp): a JSON API that must not get a locale prefix either.
    "/((?!api|_next/static|_next/image|favicon.ico|images|assets|png|svg|jpg|jpeg|gif|webp|app(?:/|$)|auth(?:/|$)|admin(?:/|$)|mcp(?:/|$)).*)",
    "/_next/static/chunks/app/:path*",
  ],
}
