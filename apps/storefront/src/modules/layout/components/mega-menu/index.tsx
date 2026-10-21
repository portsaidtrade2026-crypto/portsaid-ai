import { listCategories } from "@/lib/data/categories"
import { LIGHT_CATEGORY_FIELDS } from "@/lib/util/category-fields"
import MegaMenu from "./mega-menu"

export async function MegaMenuWrapper() {
  const categories = await listCategories({ fields: LIGHT_CATEGORY_FIELDS }).catch(() => [])

  return <MegaMenu categories={categories} />
}

export default MegaMenuWrapper
