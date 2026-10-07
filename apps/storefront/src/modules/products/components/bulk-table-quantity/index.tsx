import { MinusMini, PlusMini } from "@medusajs/icons"
import { IconButton, Input } from "@medusajs/ui"
import { useEffect, useState } from "react"
import { useI18n } from "@/lib/i18n/provider"
import { clampToCartonMinimum } from "@/lib/util/stretch-film-moq"

type BulkTableQuantityProps = {
  variantId: string
  onChange: (variantId: string, quantity: number) => void
  disabled?: boolean
  // Carton size for this variant (e.g. 30 rolls for 10cm-wide stretch
  // film) - 1 means no minimum. The first "+" from 0 jumps straight to
  // this instead of 1, and nothing is ever left between 1 and minQty-1.
  minQuantity?: number
}

const BulkTableQuantity = ({ variantId, onChange, disabled, minQuantity = 1 }: BulkTableQuantityProps) => {
  const { t } = useI18n()
  const [quantity, setQuantity] = useState("0")
  const [shiftPressed, setShiftPressed] = useState(false)

  const commit = (q: number) => {
    const clamped = clampToCartonMinimum(q, minQuantity)
    setQuantity(clamped.toString())
    onChange(variantId, clamped)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Let them type freely (e.g. clearing the field to retype) - only
    // clamped to the carton minimum on blur, not on every keystroke.
    setQuantity(e.target.value)
  }

  const handleBlur = () => {
    commit(Number(quantity) || 0)
  }

  const handleAdd = () => {
    const current = Number(quantity) || 0
    const step = shiftPressed ? 10 : 1
    // From 0, the first click should land on a full carton, not 1 unit
    // into it.
    const next = current === 0 && minQuantity > 1 ? minQuantity : current + step
    commit(next)
  }

  const handleSubtract = () => {
    const current = Number(quantity) || 0
    const step = shiftPressed ? 10 : 1
    const next = current - step
    // Stepping down out of the carton minimum goes straight to 0 (not
    // ordering it) rather than landing on a partial-carton quantity.
    commit(next < minQuantity ? 0 : next)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault()
      handleAdd()
    }

    if (e.key === "ArrowDown") {
      e.preventDefault()
      handleSubtract()
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Shift") {
        setShiftPressed(true)
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Shift") {
        setShiftPressed(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [])

  return (
    <div className="flex flex-row justify-between gap-2 w-full">
      <IconButton
        onClick={() => handleSubtract()}
        className="rounded-full hover:bg-neutral-200"
        variant="transparent"
        disabled={disabled}
        aria-label={t("Decrease quantity")}
      >
        <MinusMini />
      </IconButton>
      <Input
        value={quantity}
        onChange={(e) => handleChange(e)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        type="number"
        disabled={disabled}
        aria-label={t("Quantity")}
        className="max-w-10 text-center items-center justify-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <IconButton
        onClick={() => handleAdd()}
        className="rounded-full hover:bg-neutral-200"
        variant="transparent"
        disabled={disabled}
        aria-label={t("Increase quantity")}
      >
        <PlusMini />
      </IconButton>
    </div>
  )
}

export default BulkTableQuantity
