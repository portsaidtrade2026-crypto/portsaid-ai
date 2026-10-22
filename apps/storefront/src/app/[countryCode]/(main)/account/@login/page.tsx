import { getSocialProviders } from "@/lib/data/customer"
import LoginTemplate from "@/modules/account/templates/login-template"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to your Portsaid account.",
}

export default async function Login(props: {
  searchParams: Promise<{ next?: string }>
}) {
  const [{ next }, providers] = await Promise.all([
    props.searchParams,
    getSocialProviders(),
  ])
  // Only an in-store path is accepted as a return address.
  const safeNext =
    typeof next === "string" && /^\/[a-z]{2}\/[A-Za-z0-9\-_/]*$/.test(next) ? next : undefined
  return <LoginTemplate google={providers.google} next={safeNext} />
}
