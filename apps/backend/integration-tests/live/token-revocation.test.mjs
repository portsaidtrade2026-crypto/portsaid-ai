import assert from "node:assert/strict"
import { createHmac, randomUUID } from "node:crypto"
import { spawn } from "node:child_process"
import { once } from "node:events"
import { test } from "node:test"

const firstPort = 9200
const secondPort = 9201
const secret = `isolated-revocation-test-${randomUUID()}`
const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
const cwd = new URL("../../.medusa/server/", import.meta.url).pathname
const binary = new URL("../../node_modules/.bin/medusa", import.meta.url).pathname

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function startBackend(port) {
  const child = spawn(binary, ["start", "--host", "127.0.0.1", "--port", String(port)], {
    cwd,
    env: {
      ...process.env,
      NODE_ENV: "production",
      JWT_SECRET: secret,
      COOKIE_SECRET: secret,
    },
    stdio: "ignore",
  })
  for (let attempt = 0; attempt < 45; attempt++) {
    if (child.exitCode !== null) {
      throw new Error(`Isolated backend exited before readiness (${child.exitCode})`)
    }
    try {
      if ((await fetch(`http://127.0.0.1:${port}/health`)).ok) return child
    } catch {
      // Wait for Medusa to finish loading.
    }
    await sleep(500)
  }
  child.kill("SIGTERM")
  throw new Error("Isolated backend did not become healthy")
}

async function stopBackend(child) {
  if (!child || child.exitCode !== null) return
  child.kill("SIGTERM")
  await Promise.race([once(child, "exit"), sleep(7000)])
  if (child.exitCode === null) {
    child.kill("SIGKILL")
    await once(child, "exit")
  }
}

async function api(port, method, path, { body, token, scheme = "Bearer" } = {}) {
  const response = await fetch(`http://127.0.0.1:${port}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      "x-publishable-api-key": publishableKey,
      ...(token ? { authorization: `${scheme} ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  return { status: response.status, json: response.status === 204 ? {} : await response.json() }
}

test("revoked JWT is denied immediately, after restart, and on another instance", { timeout: 150000 }, async () => {
  assert.ok(publishableKey, "publishable key is required")
  let first
  let second
  try {
    first = await startBackend(firstPort)
    const email = `revocation-${randomUUID()}@example.invalid`
    const password = `${randomUUID()}Aa1!`
    const registered = await api(firstPort, "POST", "/auth/customer/emailpass/register", {
      body: { email, password },
    })
    assert.equal(registered.status, 200)
    assert.ok(registered.json.token)
    const created = await api(firstPort, "POST", "/store/customers", {
      body: { email, first_name: "Revocation", last_name: "Test" },
      token: registered.json.token,
    })
    assert.equal(created.status, 200)
    const loggedIn = await api(firstPort, "POST", "/auth/customer/emailpass", {
      body: { email, password },
    })
    assert.equal(loggedIn.status, 200)
    const jwt = loggedIn.json.token
    assert.ok(jwt)
    assert.equal((await api(firstPort, "GET", "/store/customers/me", { token: jwt })).status, 200)

    const segments = jwt.split(".")
    assert.equal(segments.length, 3)
    const changedSignature = `${segments[2][0] === "A" ? "B" : "A"}${segments[2].slice(1)}`
    assert.equal(
      (await api(firstPort, "GET", "/store/customers/me", {
        token: `${segments[0]}.${segments[1]}.${changedSignature}`,
      })).status,
      401
    )
    assert.equal(
      (await api(firstPort, "GET", "/store/customers/me", { token: "invalid.jwt.value" })).status,
      401
    )
    const header = JSON.parse(Buffer.from(segments[0], "base64url").toString())
    assert.equal(header.alg, "HS256", "expected Medusa's test-only HMAC signing algorithm")
    const payload = JSON.parse(Buffer.from(segments[1], "base64url").toString())
    const expiredPayload = { ...payload, iat: Math.floor(Date.now() / 1000) - 120, exp: Math.floor(Date.now() / 1000) - 60 }
    const encodedPayload = Buffer.from(JSON.stringify(expiredPayload)).toString("base64url")
    const message = `${segments[0]}.${encodedPayload}`
    const expiredSignature = createHmac("sha256", secret).update(message).digest("base64url")
    assert.equal(
      (await api(firstPort, "GET", "/store/customers/me", {
        token: `${message}.${expiredSignature}`,
      })).status,
      401
    )
    console.log("PASS login, valid JWT, altered signature, malformed JWT, expired JWT")

    assert.equal((await api(firstPort, "POST", "/store/auth/revoke", { token: jwt })).status, 200)
    assert.equal((await api(firstPort, "GET", "/store/customers/me", { token: jwt })).status, 401)
    assert.equal((await api(firstPort, "GET", "/store/customers/me", { token: jwt, scheme: "bearer" })).status, 401)
    assert.equal((await api(firstPort, "POST", "/store/auth/revoke", { token: jwt })).status, 200,
      "repeated logout after a lost response remains safe")
    assert.equal((await api(firstPort, "GET", "/store/customers/me", { token: jwt })).status, 401)
    console.log("PASS logout revocation immediately rejects old bearer JWT")

    second = await startBackend(secondPort)
    assert.equal((await api(secondPort, "GET", "/store/customers/me", { token: jwt })).status, 401)
    assert.equal((await api(secondPort, "POST", "/auth/customer/emailpass", {
      body: { email, password },
    })).status, 200, "revocation must not disable customer login")
    console.log("PASS another instance rejects old JWT while allowing a fresh login")

    await stopBackend(first)
    first = await startBackend(firstPort)
    assert.equal((await api(firstPort, "GET", "/store/customers/me", { token: jwt })).status, 401)
    console.log("PASS old JWT remains revoked after backend restart")
  } finally {
    await Promise.all([stopBackend(first), stopBackend(second)])
  }
})