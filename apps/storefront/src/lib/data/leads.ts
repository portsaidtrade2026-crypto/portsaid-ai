"use server"

// A returning visitor leaves an email and a phone number and asks the sales team to contact them
// (see modules/lead/components/returning-visitor-prompt). The lead goes to the n8n "Site Lead" workflow
// (export/panel/build-site-lead.js), which stores it in the "Site Leads" table (shown in the panel's website tab)
// and emails the sales mailbox. Validation is repeated there; this file only keeps obvious junk away from it.
const LEAD_URL = process.env.SITE_LEAD_WEBHOOK_URL || "https://n8n.portsaid.com.tr/webhook/site-lead"

export type LeadResult = { ok: true } | { ok: false; error: "invalid" | "failed" }

const EMAIL_RE = /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']{2,}$/

export async function submitSalesLead(input: {
  email: string
  phone: string
  hp?: string
  visits?: number
  page?: string
  lang?: string
}): Promise<LeadResult> {
  // honeypot: a real visitor never sees or fills this field; pretend success so bots learn nothing
  if (input.hp) return { ok: true }
  const email = (input.email || "").trim().toLowerCase().slice(0, 120)
  const phone = (input.phone || "").trim().slice(0, 30)
  const digits = phone.replace(/\D/g, "")
  if (!EMAIL_RE.test(email) || digits.length < 10 || digits.length > 15) return { ok: false, error: "invalid" }

  try {
    const res = await fetch(LEAD_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        phone,
        visits: Math.max(0, Math.min(99, Number(input.visits) || 0)),
        page: String(input.page || "").slice(0, 200),
        lang: String(input.lang || "").slice(0, 5),
      }),
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    })
    return res.ok ? { ok: true } : { ok: false, error: "failed" }
  } catch {
    return { ok: false, error: "failed" }
  }
}
