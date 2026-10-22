"use server"

import { sdk } from "@/lib/config"
import { jwtRevocationEnabled } from "@/lib/config/jwt-revocation"
import medusaError from "@/lib/util/medusa-error"
import { B2BCustomer } from "@/types/global"
import { HttpTypes } from "@medusajs/types"
import { track } from "@vercel/analytics/server"
import { revalidateTag } from "next/cache"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { retrieveCart, updateCart } from "./cart"
import { createCompany } from "./companies"
import {
  getAuthHeaders,
  getCacheOptions,
  getCacheTag,
  getCartId,
  removeAuthToken,
  removeCartId,
  setAuthToken,
} from "./cookies"

export const retrieveCustomer = async (): Promise<B2BCustomer | null> => {
  const authHeaders = await getAuthHeaders()

  // No JWT means a guest session; don't request an authenticated endpoint.
  if (!("authorization" in authHeaders)) return null

  const headers = {
    ...authHeaders,
  }

  const next = {
    ...(await getCacheOptions("customers")),
  }

  return await sdk.client
    .fetch<{ customer: B2BCustomer }>(`/store/customers/me`, {
      method: "GET",
      query: {
        fields: "*employee, *orders",
      },
      headers,
      next,
    })
    .then(({ customer }) => customer as B2BCustomer)
    .catch(() => null)
}

export const updateCustomer = async (body: HttpTypes.StoreUpdateCustomer) => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  const updateRes = await sdk.store.customer
    .update(body, {}, headers)
    .then(({ customer }) => customer)
    .catch(medusaError)

  const cacheTag = await getCacheTag("customers")
  revalidateTag(cacheTag)

  return updateRes
}

// Safe in-site redirect target: only a relative path, never an absolute/external URL.
const safeNext = (value: FormDataEntryValue | null, countryCode: string) =>
  typeof value === "string" && /^\/[a-z]{2}\/[A-Za-z0-9\-_/]*$/.test(value)
    ? value
    : `/${countryCode}/account`

// Simplest possible sign-up: email + password. Name, phone and company are asked for
// later (see saveContactDetails), when the customer sends their first quote request.
export async function quickSignup(_currentState: unknown, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim()
  const password = String(formData.get("password") ?? "")
  const accountCountryCode = formData.get("account_country_code")
  const countryCode =
    typeof accountCountryCode === "string" && /^[a-z]{2}$/.test(accountCountryCode)
      ? accountCountryCode
      : null
  if (!countryCode) {
    return "Invalid account country code"
  }
  if (!email || password.length < 8) {
    return "Password must be at least 8 characters."
  }

  try {
    const token = await sdk.auth.register("customer", "emailpass", { email, password })

    await sdk.store.customer.create({ email }, {}, { authorization: `Bearer ${token}` })

    const loginToken = await sdk.auth.login("customer", "emailpass", { email, password })
    await setAuthToken(loginToken as string)

    const cacheTag = await getCacheTag("customers")
    revalidateTag(cacheTag)

    await transferCart()
  } catch (error: any) {
    return error.toString()
  }
  redirect(safeNext(formData.get("next"), countryCode))
}

// What the quote dialog still needs from this customer. Null when not signed in.
export async function getProfileStatus() {
  const customer = await retrieveCustomer()
  if (!customer) return null
  return {
    complete: !!(
      customer.first_name &&
      customer.last_name &&
      customer.phone &&
      customer.employee?.company_id
    ),
    first_name: customer.first_name ?? "",
    last_name: customer.last_name ?? "",
    phone: customer.phone ?? "",
    has_company: !!customer.employee?.company_id,
  }
}

// Collects the details a quote needs: personal name + phone, and a minimal company record
// (name only - address etc. can be added later from the account page).
export async function saveContactDetails(formData: FormData) {
  const first_name = String(formData.get("first_name") ?? "").trim()
  const last_name = String(formData.get("last_name") ?? "").trim()
  const phone = String(formData.get("phone") ?? "").trim()
  const company_name = String(formData.get("company_name") ?? "").trim()
  const accountCountryCode = String(formData.get("account_country_code") ?? "")

  if (!first_name || !last_name || !phone || !company_name) {
    return { ok: false as const, error: "Please fill in all fields." }
  }

  try {
    const customer = await retrieveCustomer()
    if (!customer) return { ok: false as const, error: "Please log in first." }

    await updateCustomer({ first_name, last_name, phone, company_name })

    if (!customer.employee?.company_id) {
      await createCompany({
        name: company_name,
        email: customer.email,
        phone,
        currency_code: accountCountryCode === "bg" ? "eur" : "try",
      })
    }

    const cacheTag = await getCacheTag("customers")
    revalidateTag(cacheTag)
    return { ok: true as const }
  } catch (error: any) {
    return { ok: false as const, error: error?.message ?? String(error) }
  }
}

// Which social sign-in providers are configured (set in the storefront container env).
export async function getSocialProviders() {
  return {
    google: process.env.GOOGLE_LOGIN_ENABLED === "1",
    apple: process.env.APPLE_LOGIN_ENABLED === "1",
  }
}

// Starts the Google OAuth redirect through Medusa's auth provider.
export async function startGoogleLogin(next?: string) {
  const result = await sdk.auth.login("customer", "google", {})
  if (typeof result === "object" && result.location) {
    const jar = await cookies()
    jar.set("ps_oauth_next", typeof next === "string" && next.startsWith("/") ? next : "", {
      maxAge: 600,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    })
    redirect(result.location)
  }
  return "Google sign-in is not available right now."
}

export async function signup(_currentState: unknown, formData: FormData) {
  const password = formData.get("password") as string
  const accountCountryCode = formData.get("account_country_code")
  const countryCode =
    typeof accountCountryCode === "string" && /^[a-z]{2}$/.test(accountCountryCode)
      ? accountCountryCode
      : null
  if (!countryCode) {
    return "Invalid account country code"
  }
  const customerForm = {
    email: formData.get("email") as string,
    first_name: formData.get("first_name") as string,
    last_name: formData.get("last_name") as string,
    phone: formData.get("phone") as string,
    company_name: formData.get("company_name") as string,
  }

  try {
    const token = await sdk.auth.register("customer", "emailpass", {
      email: customerForm.email,
      password: password,
    })

    const customHeaders = { authorization: `Bearer ${token}` }

    await sdk.store.customer.create(
      customerForm,
      {},
      customHeaders
    )

    const loginToken = await sdk.auth.login("customer", "emailpass", {
      email: customerForm.email,
      password,
    })

    await setAuthToken(loginToken as string)

    const companyForm = {
      name: formData.get("company_name") as string,
      email: formData.get("email") as string,
      phone: formData.get("company_phone") as string,
      address: formData.get("company_address") as string,
      city: formData.get("company_city") as string,
      state: formData.get("company_state") as string,
      zip: formData.get("company_zip") as string,
      country: formData.get("company_country") as string,
      currency_code: formData.get("currency_code") as string,
    }

    // Company creation enrolls the creator as its first admin.
    await createCompany(companyForm)

    const cacheTag = await getCacheTag("customers")
    revalidateTag(cacheTag)

    await transferCart()

  } catch (error: any) {
    console.log("error", error)
    return error.toString()
  }
  redirect(`/${countryCode}/account`)
}

// For a customer bulk-imported from Ahmed's CRM (has_account=false, no
// password yet): registers a fresh auth identity, then links it to that
// EXISTING customer record via the custom /store/customers/claim route
// instead of sdk.store.customer.create(), which would create a brand new,
// disconnected customer for the same email.
export async function claimAccount(_currentState: unknown, formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const accountCountryCode = formData.get("account_country_code")
  const countryCode =
    typeof accountCountryCode === "string" && /^[a-z]{2}$/.test(accountCountryCode)
      ? accountCountryCode
      : null
  if (!countryCode) {
    return "Invalid account country code"
  }

  try {
    const token = await sdk.auth.register("customer", "emailpass", {
      email,
      password,
    })

    await sdk.client.fetch(`/store/customers/claim`, {
      method: "POST",
      body: { email },
      headers: { authorization: `Bearer ${token}` },
    })

    const loginToken = await sdk.auth.login("customer", "emailpass", {
      email,
      password,
    })

    await setAuthToken(loginToken as string)

    const cacheTag = await getCacheTag("customers")
    revalidateTag(cacheTag)
  } catch (error: any) {
    return error.toString()
  }
  redirect(`/${countryCode}/account`)
}

export async function login(_currentState: unknown, formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  try {
    await sdk.auth
      .login("customer", "emailpass", { email, password })
      .then(async (token) => {
        track("customer_logged_in")
        setAuthToken(token as string)

        const [customerCacheTag, productsCacheTag, cartsCacheTag] =
          await Promise.all([
            getCacheTag("customers"),
            getCacheTag("products"),
            getCacheTag("carts"),
          ])

        revalidateTag(customerCacheTag)

        const customer = await retrieveCustomer()
        const cart = await retrieveCart()

        if (customer?.employee?.company_id) {
          await updateCart({
            metadata: {
              ...cart?.metadata,
              company_id: customer.employee.company_id,
            },
          })
        }

        revalidateTag(productsCacheTag)
        revalidateTag(cartsCacheTag)
      })
  } catch (error: any) {
    return error.toString()
  }

  try {
    await transferCart()
  } catch (error: any) {
    return error.toString()
  }

  // Back to the page that sent the visitor to log in (e.g. the cart before a quote).
  const next = formData.get("next")
  if (typeof next === "string" && /^\/[a-z]{2}\/[A-Za-z0-9\-_/]*$/.test(next)) {
    redirect(next)
  }
}

export async function signout(countryCode: string, customerId: string) {
  const headers = await getAuthHeaders()
  if (jwtRevocationEnabled && "authorization" in headers) {
    // Revoke durably before deleting the browser credential. If the database
    // is unavailable, keep the cookie so the customer can retry logout.
    await sdk.client.fetch("/store/auth/revoke", {
      method: "POST",
      headers,
    })
  }
  await sdk.auth.logout()
  await removeAuthToken()
  track("customer_logged_out")

  // remove next line if want the cart to persist after logout
  await removeCartId()

  const [authCacheTag, customerCacheTag, productsCacheTag, cartsCacheTag] =
    await Promise.all([
      getCacheTag("auth"),
      getCacheTag("customers"),
      getCacheTag("products"),
      getCacheTag("carts"),
    ])

  revalidateTag(authCacheTag)
  revalidateTag(customerCacheTag)
  revalidateTag(productsCacheTag)
  revalidateTag(cartsCacheTag)

  redirect(`/${countryCode}/account`)
}

export async function transferCart() {
  const cartId = await getCartId()

  if (!cartId) {
    return
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  await sdk.store.cart.transferCart(cartId, {}, headers)

  const cartCacheTag = await getCacheTag("carts")

  revalidateTag(cartCacheTag)
}

export const addCustomerAddress = async (
  _currentState: unknown,
  formData: FormData
): Promise<any> => {
  const address = {
    first_name: formData.get("first_name") as string,
    last_name: formData.get("last_name") as string,
    company: formData.get("company") as string,
    address_1: formData.get("address_1") as string,
    address_2: formData.get("address_2") as string,
    city: formData.get("city") as string,
    postal_code: formData.get("postal_code") as string,
    province: formData.get("province") as string,
    country_code: formData.get("country_code") as string,
    phone: formData.get("phone") as string,
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.store.customer
    .createAddress(address, {}, headers)
    .then(async () => {
      const cacheTag = await getCacheTag("customers")
      revalidateTag(cacheTag)
      return { success: true, error: null }
    })
    .catch((err) => {
      return { success: false, error: err.toString() }
    })
}

export const deleteCustomerAddress = async (
  addressId: string
): Promise<void> => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  await sdk.store.customer
    .deleteAddress(addressId, headers)
    .then(async () => {
      const cacheTag = await getCacheTag("customers")
      revalidateTag(cacheTag)
      return { success: true, error: null }
    })
    .catch((err) => {
      return { success: false, error: err.toString() }
    })
}

export const updateCustomerAddress = async (
  currentState: Record<string, unknown>,
  formData: FormData
): Promise<any> => {
  const addressId = currentState.addressId as string

  const address = {
    first_name: formData.get("first_name") as string,
    last_name: formData.get("last_name") as string,
    company: formData.get("company") as string,
    address_1: formData.get("address_1") as string,
    address_2: formData.get("address_2") as string,
    city: formData.get("city") as string,
    postal_code: formData.get("postal_code") as string,
    province: formData.get("province") as string,
    country_code: formData.get("country_code") as string,
    phone: formData.get("phone") as string,
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.store.customer
    .updateAddress(addressId, address, {}, headers)
    .then(async () => {
      const cacheTag = await getCacheTag("customers")
      revalidateTag(cacheTag)
      return { success: true, error: null }
    })
    .catch((err) => {
      return { success: false, error: err.toString() }
    })
}
