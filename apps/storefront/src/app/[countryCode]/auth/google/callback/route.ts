import { sdk } from "@/lib/config"
import { getCacheTag, setAuthToken } from "@/lib/data/cookies"
import { transferCart } from "@/lib/data/customer"
import { getBaseURL } from "@/lib/util/env"
import { revalidateTag } from "next/cache"
import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

// Google sends the visitor back here after consent. Medusa's Google auth provider
// verifies the code; a first-time Google user gets a customer record created from the
// email in the token, then a fresh token that carries that customer.
const tokenPayload = (token: string) =>
  JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8")) as {
    actor_id?: string
    user_metadata?: { email?: string }
  }

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ countryCode: string }> }
) {
  const { countryCode } = await params
  const base = getBaseURL()
  const fail = () =>
    NextResponse.redirect(new URL(`/${countryCode}/account?error=google`, base))

  try {
    const query = Object.fromEntries(request.nextUrl.searchParams)
    let token = (await sdk.auth.callback("customer", "google", query)) as string
    const payload = tokenPayload(token)

    if (!payload.actor_id) {
      const email = payload.user_metadata?.email
      if (!email) return fail()
      await sdk.store.customer.create({ email }, {}, { authorization: `Bearer ${token}` })
      token = (await sdk.auth.refresh({ authorization: `Bearer ${token}` })) as string
    }

    await setAuthToken(token)
    revalidateTag(await getCacheTag("customers"))
    try {
      await transferCart()
    } catch {
      // a missing or already-owned cart must not block the login
    }

    const jar = await cookies()
    const next = jar.get("ps_oauth_next")?.value ?? ""
    jar.delete("ps_oauth_next")
    const safe = /^\/[a-z]{2}\/[A-Za-z0-9\-_/]*$/.test(next) ? next : `/${countryCode}/account`
    return NextResponse.redirect(new URL(safe, base))
  } catch {
    return fail()
  }
}
