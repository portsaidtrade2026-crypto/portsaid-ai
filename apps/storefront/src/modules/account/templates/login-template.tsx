"use client"

import ClaimAccount from "@/modules/account/components/claim-account"
import Login from "@/modules/account/components/login"
import LoginAd from "@/modules/account/components/login-ad"
import Register from "@/modules/account/components/register"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"

export enum LOGIN_VIEW {
  LOG_IN = "log-in",
  REGISTER = "register",
  CLAIM_ACCOUNT = "claim-account",
}

type Props = {
  // Providers whose sign-in is configured on the server (see getSocialProviders).
  google?: boolean
  // In-store path to return to after logging in, e.g. the cart a visitor came from.
  next?: string
}

const LoginTemplate = ({ google = false, next }: Props) => {
  const route = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()

  const [currentView, setCurrentView] = useState<LOGIN_VIEW>(() => {
    const viewFromUrl = searchParams.get("view") as LOGIN_VIEW
    return viewFromUrl && Object.values(LOGIN_VIEW).includes(viewFromUrl)
      ? viewFromUrl
      : LOGIN_VIEW.LOG_IN
  })

  useEffect(() => {
    if (searchParams.has("view")) {
      const newParams = new URLSearchParams(searchParams)
      newParams.delete("view")
      router.replace(
        `${route}${newParams.toString() ? `?${newParams.toString()}` : ""}`,
        { scroll: false }
      )
    }
  }, [searchParams, route, router])

  const updateView = (view: LOGIN_VIEW) => {
    setCurrentView(view)
    router.push(`/account?view=${view}${next ? `&next=${encodeURIComponent(next)}` : ""}`)
  }

  return (
    <div className="grid grid-cols-1 small:grid-cols-2 gap-6 m-2 small:m-6 min-h-[80vh]">
      <div className="flex justify-center items-center px-4 py-10 small:px-10">
        {currentView === LOGIN_VIEW.LOG_IN ? (
          <Login setCurrentView={updateView} google={google} next={next} />
        ) : currentView === LOGIN_VIEW.CLAIM_ACCOUNT ? (
          <ClaimAccount setCurrentView={updateView} />
        ) : (
          <Register setCurrentView={updateView} google={google} next={next} />
        )}
      </div>
      <LoginAd />
    </div>
  )
}

export default LoginTemplate
