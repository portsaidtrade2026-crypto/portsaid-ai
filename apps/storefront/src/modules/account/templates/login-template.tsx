"use client"

import ClaimAccount from "@/modules/account/components/claim-account"
import Login from "@/modules/account/components/login"
import Register from "@/modules/account/components/register"
import { clx } from "@medusajs/ui"
import Image from "next/image"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { useI18n } from "@/lib/i18n/provider"

export enum LOGIN_VIEW {
  LOG_IN = "log-in",
  REGISTER = "register",
  CLAIM_ACCOUNT = "claim-account",
}

const LoginTemplate = () => {
  const route = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { t } = useI18n()

  const [imageLoaded, setImageLoaded] = useState(false)
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

  useEffect(() => {
    const image = new window.Image()
    image.src = "/account-block.jpg"
    image.onload = () => {
      setImageLoaded(true)
    }
  }, [])

  const updateView = (view: LOGIN_VIEW) => {
    setCurrentView(view)
    router.push(`/account?view=${view}`)
  }

  return (
    <div className="grid grid-cols-1 small:grid-cols-2 gap-2 m-2 min-h-[80vh]">
      <div className="flex justify-center items-center ps-surface p-6 small:p-0 h-full border border-[var(--ps-line)]">
        {currentView === LOGIN_VIEW.LOG_IN ? (
          <Login setCurrentView={updateView} />
        ) : currentView === LOGIN_VIEW.CLAIM_ACCOUNT ? (
          <ClaimAccount setCurrentView={updateView} />
        ) : (
          <Register setCurrentView={updateView} />
        )}
      </div>

      <div className="relative min-h-[320px] overflow-hidden bg-[#111214]">
        <div className="absolute z-10 inset-0 flex flex-col justify-end p-8 text-white bg-gradient-to-t from-[#111214]/85 to-transparent">
          <img src="/logo-portsaid.png" alt="Portsaid Plastik" className="w-44 mb-4" />
          <p className="max-w-xs text-sm text-white/75">{t("Your supply line, made dependable.")}</p>
        </div>
        <Image
          src="/account-block.jpg"
          alt="Login banner background"
          className={clx(
            "object-cover transition-opacity duration-300 w-full h-full",
            imageLoaded ? "opacity-100" : "opacity-0"
          )}
          fill
          quality={100}
          priority
        />
      </div>
    </div>
  )
}

export default LoginTemplate
