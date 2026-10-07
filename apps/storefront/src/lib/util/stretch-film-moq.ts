// Ahmed's carton-size minimums for stretch film, keyed by roll width (cm) -
// a customer can't meaningfully order less than a whole carton. Widths are
// exactly as typed in the ERP-sourced titles (Turkish decimal comma already
// normalised to a dot when read off the title, see getStretchFilmMoq).
const WIDTH_CM_TO_CARTON_QTY: Record<string, number> = {
  "10": 30,
  "12.5": 24,
  "16.5": 18,
  "25": 12,
  "50": 6,
}

// Titles are raw, untranslated Turkish regardless of locale (see
// CLAUDE.md - no per-variant-title translation mechanism), and reliably
// end in "<width> CM" for this product family - e.g.
// "17 MİKRON ŞEFFAF STREÇ-STANDART 1.05 KG 300GR MASURA 230 M 25 CM".
// Parsing the title is more robust here than threading the variant's own
// "Genişlik" option value through every caller (product page variant
// list and cart line items fetch product/variant data differently), and
// the "streç"/"strec" check keeps this scoped to stretch film only - a
// box or tape product that happens to share a width value must not pick
// up a stretch-film carton minimum.
export function getStretchFilmCartonQty(
  title: string | null | undefined
): number {
  if (!title) return 1
  if (!/stre[çc]/i.test(title)) return 1
  const match = title.match(/(\d+(?:[.,]\d+)?)\s*cm\b/i)
  if (!match) return 1
  const width = match[1].replace(",", ".")
  return WIDTH_CM_TO_CARTON_QTY[width] ?? 1
}

// Snaps a requested quantity to the nearest valid value for this minimum:
// 0 stays 0 (not ordering it), anything below the carton minimum jumps up
// to it, anything at or above it is left alone (ordering extra loose units
// past the first carton is allowed - only the floor is enforced).
export function clampToCartonMinimum(quantity: number, minQty: number): number {
  if (quantity <= 0) return 0
  if (quantity < minQty) return minQty
  return quantity
}
