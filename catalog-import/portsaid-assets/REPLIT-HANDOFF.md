# PORTSAID asset integration

Integrate the supplied catalogue and images into the existing PORTSAID Replit site. Preserve the existing application framework and routes where possible.

## Authoritative input

Use `data/products.json` as the canonical catalogue. Its `products` array contains 431 records: 419 retained workbook records plus 12 requested inquiry/product-line entries. The 436 source rows reconcile to 419 retained and 17 excluded rows. Do not turn accounting records into products or merge ERP records merely because descriptions look similar.

Each product has a stable `id`, an ASCII `slug`, `category`, `image_filename`, `image`, `image_master`, `image_asset_id`, `translations`, `specifications`, and `source_refs`. The source SKU may be null or duplicated; use `id` as the unique key. Preserve `id` and `slug` during future edits. Four standalone locale exports are also supplied; use either these or the canonical file, not both as duplicate products.

## Images and identity

Copy `images/` into the site's static/public assets directory, for example `public/portsaid/images/`. If doing so, render an image with `/portsaid/` + product.image. Paths in the JSON are relative to the asset package root, not to the JSON file.

Product images are text-free WebP files. Each catalogue record has an independent image file. Visually similar dimensional variants reuse the same generated master, documented in `asset_manifest.json`. Do not claim each file is a separate original product photograph. Images are illustrative product-type visuals, not exact SKU photos. Used machinery, office furniture and general supply illustrations do not identify confirmed inventory or models. Preserve this distinction in product image captions where relevant, especially used machinery.

Use the supplied original logo in the site header/footer. Suggested UI palette: black `#101010`, yellow `#F4E93D`, white `#FFFFFF`, neutral text `#454545`. Yellow is a UI accent, not a required product colour. Do not burn product names, prices, logos or text into the product images.

There are 62 distinct generated masters. Three planned illustrations hit the generation usage limit: warehouse supplies reuse the pallet master, used machinery reuses the tape-slitter master, and PE foam reuses the polyethylene edge-protector master. These are related category illustrations; do not treat the machinery illustration as evidence of an actual used machine or its condition. Such records include `image_note`.

## Four languages

Locales: `ar`, `tr`, `en`, `bg`; default `tr`. Read `product.translations[locale]` for `name`, `short_description`, `description`, `specifications`, `uses`, and `image_alt`. Use category translations from `categories.json`. Set `lang` appropriately and use `dir="rtl"` for Arabic, `dir="ltr"` otherwise. Keep numeric units and identifiers readable with `bdi` or direction isolation where needed.

Avoid rendering untranslated `original_name`, internal review notes, ERP identifiers or source brands as marketing content. `source_brand` may be an ERP supplier/brand field and is not a verified storefront brand.

## Publication and commercial behaviour

- Import `publish_status: review` as drafts. Display them only in an administrative review view until their source ambiguity is resolved.
- `publish_status: ready` means editorially prepared, not stock-confirmed.
- `record_type: product_line` is an inquiry page with no SKU-level dimensions. `record_type: service` represents used machinery purchase/supply for export.
- All prices, currencies and stock quantities are null because the source supplied no values. Display a translated Request a quote action, never a zero price, fake stock or invented discount.
- Use `availability: on_request` and `order_mode: request_quote`. Do not enable checkout without actual commercial data.
- Exact machine models, food-contact documentation, load capacities, adhesive chemistry and other missing technical properties must not be fabricated.
- Preserve stated weights without interpreting them as net weight. Do not subtract core weight automatically. Preserve yards as yards. Bubble-wrap gram values are source weight markings, not verified g/m².
- Review entries with `data/review_items.json`. Correct values in the canonical catalogue only after confirmation, then regenerate locale/CSV exports.

## Data security and provenance

Keep `source_rows.json`, `source_coverage.json`, `review_items.json`, `excluded_records.json`, and generation prompts outside the public static directory unless deliberately needed for internal administration. `source_refs` retain workbook row and ERP identity for reconciliation. General old-site specifications are stored separately and must not overwrite specific workbook variants.

## Minimal rendering example

```js
import catalog from './data/products.json';
const locale = ['ar','tr','en','bg'].includes(selectedLocale) ? selectedLocale : 'tr';
const visibleProducts = catalog.products.filter(p => p.publish_status === 'ready');
const getProductView = p => ({
  id: p.id,
  slug: p.slug,
  category: p.category,
  ...p.translations[locale],
  imageUrl: '/portsaid/' + p.image,
  requestQuote: true
});
```

## Acceptance checks

1. Every retained row maps to exactly one catalogue record, and excluded rows remain excluded.
2. All 431 catalogue records have four complete locales and a resolvable image.
3. Slugs and IDs are unique. Do not use display names as identifiers.
4. Arabic lays out correctly on mobile and desktop. Bulgarian characters survive import unchanged.
5. Image cards keep the product uncropped with `object-fit: contain`.
6. Null prices and stock remain unknown. Draft review entries do not publish automatically.
7. Products can be filtered by translated category and searched in the selected language.
8. Used-machine images are presented as representative category illustrations, not photos of identified machines for sale.

Open `preview.html` locally to inspect all supplied catalogue content. It is a delivery preview, not a replacement for the Replit application.
