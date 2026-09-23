import LoginTemplate from "@/modules/account/templates/login-template"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to your Portsaid account.",
}

export default async function Login() {
  return <LoginTemplate />
}
