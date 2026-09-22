# PORTSAID TRADING — Discovery & Architecture (Pre-Build Deliverable)

Status: **Discovery phase — no production credentials connected, no code written yet.**
This document is the required first response before any implementation begins, per the master specification. Nothing here writes to Bizim Hesap, sends real WhatsApp/email/Telegram messages, or activates production tracking.

---

## 1. Summary of Understanding

PORTSAID TRADING needs a multilingual (Arabic/Turkish/English/Bulgarian) B2B website: a product catalog with rich specifications, a request-for-quotation flow (not a checkout store), a customer portal, and a lead/visitor-analytics layer — all connecting to systems the company already runs, without duplicating them. The website is the source of truth for catalog content, quotations, and visitor/lead data. The company's self-hosted n8n instance is the source of truth for automation logic and conversation state. Bizim Hesap remains the accounting/inventory source of truth. Meta WhatsApp Cloud API stays owned by n8n. The build starts from the official Medusa B2B Starter, deployed on Replit, and proceeds in three approval-gated phases.

---

## 2. Existing Systems and Proposed Responsibilities

| System | Confirmed facts | Proposed responsibility | Open items |
|---|---|---|---|
| **Website (to be built)** | N/A — greenfield, Medusa B2B Starter foundation | Public catalog, i18n content, customer auth/portal, quotations, consent records, anonymous visitor sessions, first-party analytics, PWA, admin | — |
| **n8n** (self-hosted, `n8n.portsaid.com.tr`, Hetzner) | Workflow-automation tool with custom JS Code nodes; no website chat widget/SDK; already has a WhatsApp node | Chat/AI logic, workflow automation, Meta WhatsApp workflows, Telegram workflows, email workflows, approved Bizim Hesap sync workflows, human handover, notifications | Exact webhook path(s) to expose for the website's chat proxy; whether n8n's DB already holds imported Bizim Hesap data we should read instead of re-importing |
| **Bizim Hesap** | Confirmed via `apidocs.bizimhesap.com`: `addinvoice` (creates order/invoice, auto-creates customer & product if missing), `products` (list), `warehouses` (stock). Auth via `Firma ID`. | Source of truth for invoices, products, and stock levels only | No confirmed customer-read endpoint, rate limits, webhook support, or confirmation the API is still actively maintained — **the `bizimhesap` MCP connector added to this environment requires OAuth authorization to inspect the full docs; this has not been completed yet** |
| **Meta WhatsApp Cloud API** | Direct connection (no BSP), permanent System User token, wired into n8n's WhatsApp node. Phone Number ID `1287387234463720`, number `+90 212 875 06 05` | Owned entirely by n8n; website only builds `wa.me` deep links (frontend-safe, no token needed) and requests proactive sends through n8n, never Meta directly | Approved message template names/languages for any proactive (>24h window) messages |
| **Company email** | Not yet inspected | Existing account/API/templates reused as-is | Provider name, SMTP/API credentials (test), template inventory |
| **Telegram** | Not yet inspected | Existing bot/workflow reused as-is | Bot token (test), chat/channel IDs, existing message formats |

Do not use n8n as the website's transactional database — the website keeps its own Postgres database; n8n is called only as a service for chat/automation/WhatsApp, matching the master spec's constraint.

---

## 3. Proposed System Architecture

```
                          ┌─────────────────────────────┐
                          │   CDN / Edge (geo headers)   │
                          └──────────────┬───────────────┘
                                         │
                     ┌───────────────────┴───────────────────┐
                     │      Next.js 15 Storefront (i18n)      │
                     │  (public catalog, RFQ, account, PWA)   │
                     └───────────────────┬───────────────────┘
                                         │ REST/JS SDK
                     ┌───────────────────┴───────────────────┐
                     │        Medusa Backend + Admin           │
                     │ (companies, employees, quotes, pricing, │
                     │  spending limits, cart approval)        │
                     │  + custom modules:                      │
                     │    - visitor/lead/consent tracking      │
                     │    - chat proxy endpoint (→ n8n)        │
                     │    - ERP sync jobs (→ Bizim Hesap)      │
                     └──────┬──────────────┬──────────────┬────┘
                            │              │              │
                     ┌──────┴───┐   ┌──────┴───┐   ┌──────┴───┐
                     │PostgreSQL│   │  Object  │   │  n8n     │
                     │(Replit/  │   │ Storage  │   │(external,│
                     │ Neon)    │   │ (S3-comp,│   │ Hetzner) │
                     └──────────┘   │ e.g. R2) │   └────┬─────┘
                                    └──────────┘        │
                                          ┌──────────────┼───────────────┐
                                          │              │               │
                                   ┌──────┴───┐   ┌──────┴───┐   ┌──────┴───┐
                                   │  Meta    │   │Bizim     │   │ Email/   │
                                   │ WhatsApp │   │Hesap API │   │ Telegram │
                                   │Cloud API │   │          │   │          │
                                   └──────────┘   └──────────┘   └──────────┘
```

Hosting: Replit **Reserved VM Deployment** (not Autoscale — the chat proxy and scheduled ERP polling need an always-on process). Database: Replit-managed Postgres or Neon. Object storage: S3-compatible bucket (Cloudflare R2 recommended) for images/PDFs — not local disk.

---

## 4. Website Sitemap

All routes locale-prefixed (`/ar`, `/tr`, `/en`, `/bg`):

- `/` — Home
- `/products` — Catalog (filters: category, spec, availability)
- `/products/[category]/[subcategory]`
- `/products/[slug]` — Product detail
- `/quote-list` — Comparison / quotation-selection list
- `/request-a-quote` — RFQ submission
- `/about`
- `/services`
- `/contact`
- `/register`
- `/login`
- `/account` — Overview
- `/account/quotations`
- `/account/quotations/[id]`
- `/account/company` — Company/employee management (B2B)
- `/account/settings` — Preferred language/channel, consent management
- `/privacy-policy`
- `/cookie-policy`
- `/terms`

Admin (Medusa Admin, extended): Products, Categories, Translations (Phase 2), Quotations, Customers, Leads/Visitors dashboard (Phase 2), Employees/Roles, Import tools.

---

## 5. Visitor, Lead, Customer, and Quotation Data Model

**VisitorSession** (anonymous)
`id (uuid), first_seen_at, last_seen_at, is_returning, referrer, utm_*, landing_page, country, language, device_category, browser_category, consent_analytics, consent_communication, consent_marketing, linked_customer_id (nullable)`

**VisitorEvent**
`id, session_id (fk), type (page_view|product_view|search|catalog_download|chat_open|chat_start|whatsapp_click|quote_click|quote_abandon), payload_json, occurred_at`

**Lead / Customer** (single table, `stage` enum drives classification)
`id, stage (anonymous|engaged|identified|qualified|registered|existing|inactive), full_name, company_name, email (normalized), phone (normalized E.164), whatsapp_number, telegram_handle, country, city, address, tax_id, preferred_language, preferred_channel, assigned_employee_id, tags[], segment, status, score, source, linked_session_ids[], created_at, updated_at`

**ConsentRecord**
`id, customer_id (fk, nullable), session_id (fk, nullable), type (analytics|communication|marketing), status, language, source, version, recorded_at, withdrawn_at (nullable)`

**QuotationRequest**
`id, quote_number (unique, human-readable), customer_id (fk), status (new|under_review|info_required|prepared|sent|accepted|rejected|converted|closed), destination_country, delivery_location, preferred_delivery_date, incoterm, message, attachments[], preferred_channel, internal_notes[] (employee-only), created_at, updated_at`

**QuotationLine**
`id, quotation_id (fk), product_id (fk), sku, quantity, required_specs, packaging_requirements`

**DuplicateMatchFlag**
`id, customer_id_a, customer_id_b, match_reason, status (pending|confirmed|rejected), reviewed_by, reviewed_at`

Relationships: one `VisitorSession` links to at most one `Lead/Customer` (once identified); one `Lead/Customer` has many `QuotationRequest`; one `QuotationRequest` has many `QuotationLine`; `ConsentRecord` can attach to a session before identification and later to the resolved customer.

---

## 6. Data-Flow Diagrams

**A. Chat message**
```
Browser widget → POST /api/chat (Next.js/Medusa route, same-origin)
   → validates session, attaches page/product context
   → server-side call to n8n webhook (shared-secret header)
      → n8n workflow (logic/AI/handover)
   ← n8n response
← relayed to browser
[on n8n timeout/error → widget shows "Chat unavailable — Contact us on WhatsApp" fallback]
```

**B. Quotation → ERP**
```
Customer submits RFQ → QuotationRequest (status=new) stored in website DB
Employee prepares quote → status=prepared → sent → accepted
On accepted → employee marks "Converted to order"
   → website backend calls Bizim Hesap `addinvoice` (Firma ID auth)
   → response logged; on failure, employee notified, status stays "accepted" (not silently marked converted)
   → on success, status=converted, Bizim Hesap invoice ID stored
```

**C. WhatsApp — outbound click (no API)**
```
Product page → "Contact via WhatsApp" button
   → builds wa.me/902128750605?text=<safe product context, current locale>
   → opens in new tab, no server round-trip
```

**D. WhatsApp — proactive message (website-initiated)**
```
Website backend → n8n webhook (customer_id, intent, language)
   → n8n sends via its existing WhatsApp node (approved template if outside 24h window)
[website never touches the Meta token or Graph API]
```

**E. ERP pull (products/stock)**
```
Scheduled job (Reserved VM, e.g. every N hours) → Bizim Hesap `products` + `warehouses`
   → dry-run diff against website catalog on first run
   → upsert into website catalog (price visibility per admin setting)
   → timestamped sync report + error log
```

---

## 7. Integration Map

| Data type | Owner (source of truth) | Direction | Sync method | Auth | Status |
|---|---|---|---|---|---|
| Product catalog content (i18n, images, specs) | Website | — | Manual/admin entry | — | Ready to build |
| Product price/stock | Bizim Hesap | Bizim Hesap → Website | Scheduled polling (`products`, `warehouses`) | Firma ID | Confirmed endpoints; polling only (no webhook confirmed) |
| Orders/invoices | Website creates, Bizim Hesap records | Website → Bizim Hesap | `addinvoice` on quotation conversion | Firma ID | Confirmed endpoint |
| Customers (new) | Website (registration) / Bizim Hesap (auto-create on invoice) | Bidirectional, matched by normalized phone/email | Website registration + `addinvoice` auto-create | Firma ID | Customer-read endpoint on Bizim Hesap unconfirmed |
| Customers (historical) | Bizim Hesap | Bizim Hesap → Website | One-time manual export/import | — | Needed only if no read endpoint exists |
| Chat/conversation logic | n8n | Website ↔ n8n | Server-to-server webhook, shared secret | Shared secret header | Needs a designated n8n webhook path (test + prod) |
| WhatsApp send | n8n (owns Meta token) | Website → n8n → Meta | Webhook call to n8n | Shared secret header (website↔n8n); System User token stays in n8n | wa.me links need no auth; proactive send needs approved templates |
| Consent/visitor/lead data | Website | — | First-party | — | Ready to build |
| Email | Existing provider | Website → provider | TBD pending provider details | TBD | Provider not yet identified |
| Telegram | Existing bot | Website → n8n → Telegram (preferred, to avoid a second bot) | Webhook to n8n | TBD | Bot details not yet provided |

---

## 8. Required API Documentation, Webhooks, Test Credentials, and Field Mappings

Still needed before Phase 2/3 work can start on each item:

1. **n8n**: a dedicated test webhook path (or a documented safe path on the existing instance) for the chat proxy; the exact shared-secret/signature scheme n8n expects; sample request/response payloads for the chat workflow.
2. **Bizim Hesap**: complete the OAuth authorization for the `bizimhesap` MCP connector already registered in this environment (`claude mcp` / `/mcp` in an interactive session) so the full API docs (auth details beyond `Firma ID`, rate limits, customer endpoint, webhook support, maintenance status) can be read; a test/sandbox `Firma ID` if Bizim Hesap offers one, otherwise written confirmation from their support of safe testing practice against the live account.
3. **Meta WhatsApp**: a separate test phone number/WABA for Phase 2 automated testing (not the live `+90 212 875 06 05` number); list of currently approved message templates (names + approved languages) if proactive messaging is in scope.
4. **Email**: provider name (e.g. Google Workspace/Zoho Mail/SMTP relay), test sending credentials, existing template inventory.
5. **Telegram**: bot token (test), relevant chat/channel IDs, existing message formats if any.
6. Field-level mapping table for `addinvoice`/`products`/`warehouses` payloads vs. the website's own schema (to be produced once item 2 is unblocked).

---

## 9. Technical Risks and Possible Conflicts

- **Bizim Hesap API maturity unknown**: indexed docs appear old; must get written confirmation from support that it's still supported before building production dependencies on it.
- **No confirmed customer-read endpoint**: risk of building the wrong migration strategy; mitigated by treating historical import as one-time/manual until confirmed otherwise.
- **Single shared WhatsApp number/webhook**: any misconfiguration on the website side calling n8n incorrectly must not be able to disrupt n8n's existing WhatsApp workflow — the website must never register its own Meta webhook subscription.
- **n8n as a single point of failure for chat**: mitigated by the mandatory fallback-to-WhatsApp UI when n8n is unreachable.
- **Replit Reserved VM cost/ops**: always-on deployment costs more than Autoscale; needed for webhook/cron reliability — confirm budget acceptance.
- **Multi-jurisdiction privacy compliance**: customers span Egypt, Gulf, Türkiye, EU (Bulgaria) — consent/retention rules should be reviewed against GDPR at minimum, since it's the strictest applicable regime, rather than assuming one law fits all markets.
- **Duplicate customers**: normalized phone/email matching reduces but doesn't eliminate risk; uncertain matches must be flagged, not auto-merged, per spec.
- **Translation completeness**: deferring the non-technical translation UI to Phase 2 means Phase 1 content updates require developer involvement — acceptable short-term trade-off, should be communicated to non-technical staff.

---

## 10–11. Phased Implementation Plan with Acceptance Criteria

**Phase 1 — Foundation (no external credentials required)**
Scope: Import Medusa B2B Starter; public catalog; 4 languages (DB-backed, next-intl); customer registration; manual customer creation; quotation requests; mobile-responsive admin; initial PWA; deploy to Replit Reserved VM from day one.
Acceptance criteria:
- [ ] Medusa B2B Starter runs locally and on Replit Reserved VM without errors.
- [ ] Catalog browsable and searchable in all 4 languages, correct RTL for Arabic.
- [ ] Customer can self-register; employee can create a customer manually; duplicate phone/email is flagged, not silently merged.
- [ ] Customer can submit an RFQ with multiple products and see its status.
- [ ] Admin usable on a mobile viewport for: add/find customer, view quotation, update product photo/availability.
- [ ] PWA installable on Android and iOS Safari (within platform limits); offline state shown for uncached routes.
- [ ] No production third-party credentials present anywhere in the codebase.

**Phase 2 — Engagement (requires items in Section 8: n8n test webhook, Meta test number)**
Scope: Custom chat widget + secure server-side proxy to n8n test workflow, with WhatsApp-fallback on failure; WhatsApp deep-link buttons site-wide; visitor/session tracking and consent; lead scoring (admin-editable); customer matching against Phase 1 records; full non-technical translation-editing dashboard with completeness indicators.
Acceptance criteria:
- [ ] Chat widget sends page/product context to n8n test workflow and displays its reply in all 4 languages.
- [ ] Chat widget degrades gracefully (WhatsApp fallback) when n8n test endpoint is unreachable, verified by a forced-failure test.
- [ ] Visitor session created anonymously, later linked to identified lead on verified contact info, with source/interest history preserved.
- [ ] Lead score changes are visible and rule set is editable by a non-technical admin without code changes.
- [ ] Translation dashboard flags missing strings per product/category/page.
- [ ] No Meta token or n8n shared secret present in any front-end bundle (verified by build inspection).

**Phase 3 — Back-office integration (requires items in Section 8: Bizim Hesap access confirmed, email/Telegram credentials)**
Scope: `addinvoice` push on quotation conversion (idempotent); scheduled `products`/`warehouses` polling with dry-run preview; one-time historical customer import if no read endpoint exists; email notifications (multilingual templates); Telegram notifications via n8n; reporting dashboard; production launch.
Acceptance criteria:
- [ ] Converting a test quotation creates exactly one Bizim Hesap invoice, verified by re-running the same conversion and confirming no duplicate is created.
- [ ] A dry-run product/stock sync report is reviewed and approved before the first live run.
- [ ] Email and Telegram notifications fire correctly in all 4 languages using test accounts.
- [ ] Full critical-journey demo (per master spec Section 24) completed successfully in Turkish, Arabic, English, and Bulgarian.
- [ ] Explicit written approval received before any production credential is connected or any real message is sent.

---

## 12. Visual Design Proposal (Desktop & Mobile)

Direction: professional international-trade B2B — not a generic AI-generated storefront.

- **Palette**: a deep navy/steel-blue primary (trust, industrial), a warm neutral gray-beige for backgrounds, a single accent (amber or teal) reserved for CTAs ("Request a Quote", "Send on WhatsApp"). No decorative gradients.
- **Typography**: a humanist sans for Latin/Cyrillic (e.g. Inter or IBM Plex Sans, which both ship a matching Arabic cut) paired with its Arabic companion for RTL — avoids the common mismatch of a generic Arabic web font next to a mismatched Latin one.
- **Layout**: header with logo, mega-menu categories, language switcher, WhatsApp icon, account icon; hero with a single clear value statement and a "Browse Catalog" + "Request a Quote" pair of CTAs; category tiles; featured products grid; trust strip (countries served, years in business); footer with full contact block and policy links.
- **Product detail**: image gallery left/top, specs table (collapsible on mobile), sticky "Add to Quote List" action, related products below the fold.
- **Mobile**: bottom-anchored primary action bar (Quote List / WhatsApp), filters as a slide-up sheet rather than a sidebar, spec tables converted to stacked key-value cards.
- Deliverable on request: a clickable HTML wireframe (desktop + mobile) can be produced as a follow-up artifact once this direction is approved.

---

## 13. What Will Be Built vs. Reused

**Reused as-is (Medusa B2B Starter)**: company accounts, company employees, customer accounts/groups, product catalog core, bulk product selection, RFQ flow, quote management, customer-specific price lists, custom pricing, spending limits, cart-approval workflows, Medusa Admin, API architecture.

**Custom-built (not available off the shelf)**:
- i18n content layer for 4 languages incl. Arabic RTL (next-intl integration on top of Medusa)
- Country→language auto-selection via edge geo headers
- Chat widget + server-side proxy to n8n (Section 6-A)
- WhatsApp deep-link components + n8n proactive-send trigger
- Visitor/session tracking, consent management, lead scoring engine
- Non-technical translation-editing dashboard (Phase 2)
- Bizim Hesap sync jobs (push + poll) and admin-visible sync reports
- Visitor analytics dashboard and customer timeline
- PWA manifest, service worker, offline/update-available UX
- Role-based permission layer beyond Medusa's defaults (Content Editor, Customer Support, Read-only Employee)

---

## 14. Secure Testing and Rollback Plan

- All Phase 2/3 work happens against **test credentials only** (test n8n path, test WABA, sandbox/confirmed-safe Bizim Hesap access) until explicit sign-off.
- Feature flags gate chat widget, WhatsApp proactive-send, and ERP push independently, so any one integration can be disabled in production without a redeploy.
- Staging environment: a second Replit Reserved VM Deployment with its own database, isolated from production data, used for every phase's acceptance testing before promotion.
- Database changes ship as reversible migrations; each migration has a tested down-path before it is applied to production.
- Rollback path: redeploy the previous known-good build (Replit deployment history / git tag) and run the corresponding migration down-path; no destructive schema changes without a verified backup taken immediately before.
- Backups: scheduled Postgres backups (Replit/Neon native or `pg_dump` to object storage) with a documented restore drill before go-live.
- Production activation checklist (must all be true before flipping any feature flag to production credentials): item matches the "wait for approval before" list in the master spec — production credentials, webhook changes, Bizim Hesap writes, real WhatsApp/email/Telegram sends, customer migration, and visitor tracking all require explicit sign-off, tracked as separate approvals, not one blanket go-ahead.

---

## Immediate next step

Phase 1 has zero external dependencies and can start now: importing and running the Medusa B2B Starter in this repository. Confirm to proceed, or flag any correction needed to the above before implementation begins.
