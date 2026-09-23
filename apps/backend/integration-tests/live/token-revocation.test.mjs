import assert from "node:assert/strict"
import { createHmac, randomUUID } from "node:crypto"
import { spawn } from "node:child_process"
import { once } from "node:events"
import { createServer } from "node:net"
import { test } from "node:test"

const databaseUrl = process.env.REVOCATION_TEST_DATABASE_URL
const disposableGuard = process.env.REVOCATION_TEST_DATABASE_DISPOSABLE
const mode = process.env.REVOCATION_TEST_MODE || "enabled"
const secret = `isolated-revocation-test-${randomUUID()}`
const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
const cwd = new URL("../../.medusa/server/", import.meta.url).pathname
const binary = new URL("../../node_modules/.bin/medusa", import.meta.url).pathname

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function requireDisposableDatabase() {
  assert.equal(mode === "enabled" || mode === "disabled", true,
    "REVOCATION_TEST_MODE must be disabled or enabled")
  assert.equal(process.env.DATABASE_URL, undefined,
    "DATABASE_URL is forbidden; provide only REVOCATION_TEST_DATABASE_URL")
  assert.ok(databaseUrl, "REVOCATION_TEST_DATABASE_URL is required; DATABASE_URL is never used")
  assert.equal(disposableGuard, "1",
    "REVOCATION_TEST_DATABASE_DISPOSABLE=1 is required for the local disposable database")
  const url = new URL(databaseUrl)
  assert.equal(url.protocol, "postgres:", "REVOCATION_TEST_DATABASE_URL must be postgres://")
  assert.ok(["localhost", "127.0.0.1", "::1"].includes(url.hostname),
    "revocation tests require a local PostgreSQL host")
  assert.match(url.pathname, /^\/revocation_test_[a-z0-9_]+$/i,
    "database name must be an explicitly disposable revocation_test_* database")
}

async function freePort() {
  const server = createServer()
  await new Promise((resolve, reject) => {
    server.once("error", reject)
    server.listen(0, "127.0.0.1", resolve)
  })
  const { port } = server.address()
  await new Promise((resolve) => server.close(resolve))
  return port
}

async function startBackend(port) {
  const child = spawn(binary, ["start", "--host", "127.0.0.1", "--port", String(port)], {
    cwd,
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      NODE_ENV: "production",
      JWT_SECRET: secret,
      COOKIE_SECRET: secret,
    },
    stdio: ["ignore", "pipe", "pipe"],
  })
  let diagnostics = ""
  const collect = (chunk) => {
    diagnostics = `${diagnostics}${chunk}`.slice(-12000)
  }
  child.stdout.on("data", collect)
  child.stderr.on("data", collect)
  for (let attempt = 0; attempt < 45; attempt++) {
    if (child.exitCode !== null) {
      throw new Error(`Isolated backend exited before readiness (${child.exitCode})\n${diagnostics}`)
    }
    try {
      if ((await fetch(`http://127.0.0.1:${port}/health`)).ok) return child
    } catch {
      // Wait for Medusa to finish loading.
    }
    await sleep(500)
  }
  await stopBackend(child)
  throw new Error(`Isolated backend did not become healthy on port ${port}\n${diagnostics}`)
}

async function stopBackend(child) {
  if (!child || child.exitCode !== null) return
  child.kill("SIGTERM")
  await Promise.race([once(child, "exit"), sleep(7000)]).catch(() => {})
  if (child.exitCode === null) {
    child.kill("SIGKILL")
    await Promise.race([once(child, "exit"), sleep(2000)]).catch(() => {})
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
  requireDisposableDatabase()
  assert.ok(publishableKey, "publishable key is required")
  const firstPort = await freePort()
  const secondPort = await freePort()
  let first
  let second
  const expectedStatus = mode === "enabled" ? 401 : 200
  const expectedRevoked = mode === "enabled"
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

    const logout = await api(firstPort, "POST", "/store/auth/revoke", { token: jwt })
    assert.equal(logout.status, 200)
    assert.equal(logout.json.revoked, expectedRevoked)
    assert.equal((await api(firstPort, "GET", "/store/customers/me", { token: jwt })).status, expectedStatus)
    assert.equal((await api(firstPort, "GET", "/store/customers/me", { token: jwt, scheme: "bearer" })).status, expectedStatus)
    const repeatedLogout = await api(firstPort, "POST", "/store/auth/revoke", { token: jwt })
    assert.equal(repeatedLogout.status, 200,
      "repeated logout after a lost response remains safe")
    assert.equal(repeatedLogout.json.revoked, expectedRevoked)
    assert.equal((await api(firstPort, "GET", "/store/customers/me", { token: jwt })).status, expectedStatus)
    console.log(`PASS logout response and old bearer JWT behavior (${mode})`)

    second = await startBackend(secondPort)
    assert.equal((await api(secondPort, "GET", "/store/customers/me", { token: jwt })).status, expectedStatus)
    assert.equal((await api(secondPort, "POST", "/auth/customer/emailpass", {
      body: { email, password },
    })).status, 200, "revocation must not disable customer login")
    console.log(`PASS another instance preserves old JWT behavior (${mode}) while allowing a fresh login`)

    await stopBackend(first)
    first = await startBackend(firstPort)
    assert.equal((await api(firstPort, "GET", "/store/customers/me", { token: jwt })).status, expectedStatus)
    console.log(`PASS old JWT behavior remains stable after backend restart (${mode})`)
  } finally {
    await Promise.all([stopBackend(first), stopBackend(second)])
  }
})