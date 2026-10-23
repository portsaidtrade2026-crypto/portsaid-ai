// Field lists for /store/product-categories. The default query in lib/data/categories.ts embeds EVERY product of EVERY
// category (3.2 MB and ~2 s from the backend on the live catalogue). Anything that only needs names and links - the
// header menu, the footer, the home page tiles, the store sidebar - asks for these instead (17 KB, ~0.25 s). When such a
// list is handed to a client component, the heavy version is also written into the page HTML: it was 3.1 MB of the 3.9 MB
// home page and sat on every page.
export const LIGHT_CATEGORY_FIELDS = "id,name,handle,description,parent_category_id,+metadata"
// ... plus the child references the store sidebar walks
export const LIGHT_CATEGORY_TREE_FIELDS = `${LIGHT_CATEGORY_FIELDS},*category_children`
