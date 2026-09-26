"use client"

import { useCart } from "@/lib/context/cart-context"
import { getCheckoutStep } from "@/lib/util/get-checkout-step"
import CartToCsvButton from "@/modules/cart/components/cart-to-csv-button"
import CartTotals from "@/modules/cart/components/cart-totals"
import PromotionCode from "@/modules/checkout/components/promotion-code"
import Button from "@/modules/common/components/button"
import Divider from "@/modules/common/components/divider"
import LocalizedClientLink from "@/modules/common/components/localized-client-link"
import { RequestQuoteConfirmation } from "@/modules/quotes/components/request-quote-confirmation"
import { RequestQuotePrompt } from "@/modules/quotes/components/request-quote-prompt"
import { B2BCustomer } from "@/types"
import { ApprovalStatusType } from "@/types/approval"
import { ExclamationCircle } from "@medusajs/icons"
import { Container } from "@medusajs/ui"
import { useI18n } from "@/lib/i18n/provider"

type SummaryProps = {
  customer: B2BCustomer | null
  spendLimitExceeded: boolean
}

const Summary = ({ customer, spendLimitExceeded }: SummaryProps) => {
  const { handleEmptyCart, cart } = useCart()
  const { t } = useI18n()

  if (!cart) return null

  const checkoutStep = getCheckoutStep(cart)
  const checkoutPath = checkoutStep
    ? `/checkout?step=${checkoutStep}`
    : "/checkout"

  const checkoutButtonLink = customer ? checkoutPath : "/account"

  const isPendingApproval = cart?.approvals?.some(
    (approval) => approval?.status === ApprovalStatusType.PENDING
  )

  // Request-quote items carry no real price (unit_price 0) - checking out
  // would mean paying nothing for a real product. Route those carts to
  // "Request Quote" instead; checkout stays available once every line has
  // an actual price (e.g. after Ahmed prices the product, or for a cart of
  // priced items only).
  const hasUnpricedItems = cart.items?.some((item) => !item.unit_price)

  return (
    <Container className="flex flex-col gap-y-3">
      <CartTotals />
      <Divider />
      <PromotionCode cart={cart} />
      <Divider className="my-6" />
      {spendLimitExceeded && (
        <div className="flex items-center gap-x-2 bg-neutral-100 p-3 rounded-md shadow-borders-base">
          <ExclamationCircle className="text-orange-500 w-fit overflow-visible" />
          <p className="text-neutral-950 text-xs">
            {t("This order exceeds your spending limit.")}
            <br />
            {t("Please contact your manager for approval.")}
          </p>
        </div>
      )}
      {hasUnpricedItems && (
        <p className="text-ui-fg-subtle text-xs -mt-2">
          {t("Some items need a quote before you can check out - use Request Quote below.")}
        </p>
      )}
      <LocalizedClientLink
        href={checkoutButtonLink}
        data-testid="checkout-button"
        aria-disabled={hasUnpricedItems}
        onClick={(e) => {
          if (hasUnpricedItems) e.preventDefault()
        }}
      >
        <Button
          className="w-full h-10 rounded-full shadow-none"
          disabled={spendLimitExceeded || hasUnpricedItems}
        >
          {customer
            ? spendLimitExceeded
              ? t("Spending Limit Exceeded")
              : t("Checkout")
            : t("Log in to Checkout")}
        </Button>
      </LocalizedClientLink>
      {!!customer && (
        <RequestQuoteConfirmation>
          <Button
            className="w-full h-10 rounded-full shadow-borders-base"
            variant="secondary"
            disabled={isPendingApproval}
          >
            {t("Request Quote")}
          </Button>
        </RequestQuoteConfirmation>
      )}
      {!customer && (
        <RequestQuotePrompt>
          <Button
            className="w-full h-10 rounded-full shadow-borders-base"
            variant="secondary"
            disabled={isPendingApproval}
          >
            {t("Request Quote")}
          </Button>
        </RequestQuotePrompt>
      )}
      <CartToCsvButton cart={cart} />
      <Button
        onClick={handleEmptyCart}
        className="w-full h-10 rounded-full shadow-borders-base"
        variant="secondary"
        disabled={isPendingApproval}
      >
        {t("Empty Cart")}
      </Button>
    </Container>
  )
}

export default Summary
