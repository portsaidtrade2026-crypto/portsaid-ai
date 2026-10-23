"use client"

import { createQuote } from "@/lib/data/quotes"
import { getProfileStatus, saveContactDetails } from "@/lib/data/customer"
import { useI18n } from "@/lib/i18n/provider"
import { XCircle } from "@medusajs/icons"
import { toast } from "@medusajs/ui"
import Button from "@/modules/common/components/button"
import Input from "@/modules/common/components/input"
import * as Dialog from "@radix-ui/react-dialog"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"

type Status = Awaited<ReturnType<typeof getProfileStatus>>

export const RequestQuoteConfirmation = ({
  children,
  open: controlledOpen,
  onOpenChange,
}: {
  children?: React.ReactNode
  // The cart drawer renders this dialog OUTSIDE itself, controlled: a Radix dialog nested in
  // the drawer trapped focus in the drawer, so the form fields could not be typed into.
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) => {
  const { t } = useI18n()
  const [requesting, setRequesting] = useState(false)
  const [innerOpen, setInnerOpen] = useState(false)
  const open = controlledOpen ?? innerOpen
  const setOpen = (value: boolean) => {
    setInnerOpen(value)
    onOpenChange?.(value)
  }
  const [status, setStatus] = useState<Status | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const { countryCode } = useParams<{ countryCode: string }>()
  const router = useRouter()

  // Sign-up only asks for email + password, so on the first quote request the customer
  // is asked for the rest (name, phone, company) right here, before the quote is sent.
  useEffect(() => {
    if (!open) return
    setError(null)
    getProfileStatus().then(setStatus).catch(() => setStatus(null))
  }, [open])

  const sendQuote = async () => {
    try {
      const { quote } = await createQuote()
      router.push(`/${countryCode}/account/quotes/details/${quote.id}`)
      setOpen(false)
    } catch (e) {
      toast.error(t("Failed to create quote request"))
    }
    setRequesting(false)
  }

  const handleConfirm = async () => {
    setRequesting(true)
    await sendQuote()
  }

  const handleDetailsSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setRequesting(true)
    setError(null)
    const result = await saveContactDetails(new FormData(event.currentTarget))
    if (!result.ok) {
      setError(t(result.error))
      setRequesting(false)
      return
    }
    await sendQuote()
  }

  const needsDetails = status ? !status.complete : false

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      {children && <Dialog.Trigger asChild>{children}</Dialog.Trigger>}

      <Dialog.Portal>
        <Dialog.Overlay className="bg-black/50 data-[state=open]:animate-overlayShow fixed inset-0 z-[75]" />
        <Dialog.Content className="z-[100] data-[state=open]:animate-contentShow fixed top-[50%] left-[50%] max-h-[85vh] w-[90vw] max-w-[450px] translate-x-[-50%] translate-y-[-50%] overflow-y-auto rounded-[6px] bg-white p-[25px] shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] focus:outline-none">
          <Dialog.Title className="text-lg mb-6 flex justify-between">
            {needsDetails ? t("Complete your details") : t("Submit request for quote")}
            <Dialog.Close asChild>
              <XCircle className="text-violet11 hover:bg-violet4 focus:shadow-violet7 inline-flex appearance-none items-center justify-center rounded-full focus:shadow-[0_0_0_2px] outline-none cursor-pointer" />
            </Dialog.Close>
          </Dialog.Title>

          {needsDetails && status ? (
            <form onSubmit={handleDetailsSubmit} className="flex flex-col gap-y-3">
              <Dialog.Description className="text-sm text-neutral-600 mb-1">
                {t("We need a few details to send you an accurate quote.")}
              </Dialog.Description>
              <input type="hidden" name="account_country_code" value={countryCode} />
              <Input
                label={t("First name")}
                name="first_name"
                required
                autoComplete="given-name"
                defaultValue={status.first_name}
              />
              <Input
                label={t("Last name")}
                name="last_name"
                required
                autoComplete="family-name"
                defaultValue={status.last_name}
              />
              <Input
                label={t("Phone")}
                name="phone"
                type="tel"
                required
                autoComplete="tel"
                defaultValue={status.phone}
              />
              <Input
                label={t("Company name")}
                name="company_name"
                required
                autoComplete="organization"
              />
              {error && <p className="text-small-regular text-rose-500">{error}</p>}
              <div className="mt-4 flex justify-end gap-x-2">
                <Dialog.Close asChild>
                  <Button variant="secondary" type="button" disabled={requesting}>
                    {t("Cancel")}
                  </Button>
                </Dialog.Close>
                <Button type="submit" isLoading={requesting}>
                  {t("Send quote request")}
                </Button>
              </div>
            </form>
          ) : (
            <>
              <div className="flex flex-col gap-y-4">
                <p>
                  {t("You are about to request a quote for the cart. If you confirm, the cart will be converted to a quote.")}
                </p>
              </div>

              <div className="mt-[25px] flex justify-end gap-x-2">
                <Dialog.Close asChild>
                  <Button variant="secondary" disabled={requesting}>
                    {t("Cancel")}
                  </Button>
                </Dialog.Close>

                <Button
                  onClick={handleConfirm}
                  isLoading={requesting}
                  disabled={status === undefined}
                >
                  {t("Submit")}
                </Button>
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
