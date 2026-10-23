// Asks the n8n "Email Verify" workflow to email a confirmation link to a customer who just signed up.
// Fire and forget on purpose: a slow or failing mail service must never break sign-up, and the workflow itself
// ignores repeats and bad addresses (see export/panel/build-email-verify.js). Server-side only.
const VERIFY_URL =
  process.env.EMAIL_VERIFY_WEBHOOK_URL || "https://n8n.portsaid.com.tr/webhook/email-verify-send"

export async function requestEmailVerification(email: string, name?: string) {
  const address = (email || "").trim()
  if (!address) return
  try {
    await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: address, name: (name || "").trim() }),
      signal: AbortSignal.timeout(4000),
    })
  } catch {
    // ignore: verification is a flag, not a gate
  }
}
