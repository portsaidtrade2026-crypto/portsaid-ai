import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { gunzipSync } from "node:zlib"

// These public-domain IPtoASN files contain only countries with a non-English
// locale. Every other address defaults to English without a remote lookup.
const DATA_FILES = {
  ipv4: "locale-country-v4-u32.tsv.gz",
  ipv6: "locale-country-v6.tsv.gz",
} as const
const MAX_COMPRESSED_BYTES = 8 * 1024 * 1024
const MAX_DECOMPRESSED_BYTES = 80 * 1024 * 1024
const CACHE_TTL = 24 * 60 * 60 * 1000
const ZERO = BigInt(0)
const ONE = BigInt(1)
const SIXTEEN = BigInt(16)
const THIRTY_TWO = BigInt(32)
const ONE_TWENTY = BigInt(120)

export type CountryRange = readonly [bigint, bigint, string]
export type CountryDatabase = {
  ipv4: CountryRange[]
  ipv6: CountryRange[]
}

const emptyDatabase = (): CountryDatabase => ({ ipv4: [], ipv6: [] })
let databasePromise: Promise<CountryDatabase> | undefined
let databaseExpiresAt = 0

function parseIpv4(value: string): bigint | undefined {
  const parts = value.split(".")
  if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part))) return
  const numbers = parts.map(Number)
  if (numbers.some((part) => part > 255)) return
  return (BigInt(numbers[0]) << BigInt(24)) | (BigInt(numbers[1]) << BigInt(16)) |
    (BigInt(numbers[2]) << BigInt(8)) | BigInt(numbers[3])
}

function ipv4IsPrivate(value: bigint) {
  const first = Number(value >> BigInt(24))
  const second = Number((value >> BigInt(16)) & BigInt(255))
  return first === 0 || first === 10 || first === 127 || first >= 224 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && (second === 0 || second === 168))
}

export function ipv6ToBigInt(value: string): bigint | undefined {
  const input = value.toLowerCase().split("%", 1)[0]
  if (!input || input.includes(":::")) return
  const parts = input.split("::")
  if (parts.length > 2) return
  const left = parts[0] ? parts[0].split(":") : []
  const right = parts.length === 2 && parts[1] ? parts[1].split(":") : []
  const expanded = [...left, ...right]
  if (expanded.some((part) => !/^[0-9a-f]{1,4}$/.test(part))) return
  if (parts.length === 1 && expanded.length !== 8) return
  if (parts.length === 2 && expanded.length >= 8) return
  const words = parts.length === 2
    ? [...left, ...Array(8 - expanded.length).fill("0"), ...right]
    : expanded
  return words.reduce((result, word) => (result << SIXTEEN) | BigInt(parseInt(word, 16)), ZERO)
}

function parseIp(value: string): { version: 4 | 6; value: bigint } | undefined {
  const trimmed = value.trim().replace(/^\[|\]$/g, "")
  const v4 = parseIpv4(trimmed)
  if (v4 !== undefined) return { version: 4, value: v4 }
  const v6 = ipv6ToBigInt(trimmed)
  if (v6 === undefined) return
  // IPv4-mapped IPv6 addresses should use the same private-address rules.
  if (v6 >> THIRTY_TWO === BigInt(0xffff)) return { version: 4, value: v6 & BigInt(0xffffffff) }
  return { version: 6, value: v6 }
}

export function extractPublicClientIp(values: {
  forwardedFor?: string | null
  realIp?: string | null
}): string | undefined {
  const candidates = [
    ...(values.forwardedFor?.split(",") ?? []),
    values.realIp ?? "",
  ]
  for (const candidate of candidates) {
    const raw = candidate.trim()
    const ip = raw.startsWith("[")
      ? raw.slice(0, raw.indexOf("]") + 1)
      : raw.includes(":") && raw.indexOf(":") === raw.lastIndexOf(":")
        ? raw.replace(/:\d+$/, "")
        : raw
    const parsed = parseIp(ip)
    if (parsed && !(parsed.version === 4 ? ipv4IsPrivate(parsed.value) :
      parsed.value === ZERO || parsed.value === ONE || parsed.value === (ONE << BigInt(128)) - ONE ||
      (parsed.value >> BigInt(118)) === BigInt(0b1111111010) || // fe80::/10
      (parsed.value >> ONE_TWENTY) === BigInt(0xfc) || (parsed.value >> ONE_TWENTY) === BigInt(0xfd) ||
      (parsed.value >> ONE_TWENTY) === BigInt(0xff))) return ip
  }
  return undefined
}

function parseDatabase(text: string, version: 4 | 6): CountryRange[] {
  const ranges: CountryRange[] = []
  for (const line of text.split(/\r?\n/)) {
    const [startText, endText, country] = line.split("\t")
    if (!startText || !endText || !country || country === "None") continue
    const start = version === 4 ? parseIpv4(startText) ?? BigInt(startText) : ipv6ToBigInt(startText)
    const end = version === 4 ? parseIpv4(endText) ?? BigInt(endText) : ipv6ToBigInt(endText)
    if (start !== undefined && end !== undefined && start <= end && /^[A-Z]{2}$/.test(country)) {
      ranges.push([start, end, country])
    }
  }
  return ranges
}

export function parseCountryDatabase(ipv4Text: string, ipv6Text = ""): CountryDatabase {
  return { ipv4: parseDatabase(ipv4Text, 4), ipv6: parseDatabase(ipv6Text, 6) }
}

export function lookupCountry(ip: string, database: CountryDatabase): string | undefined {
  const parsed = parseIp(ip)
  if (!parsed || (parsed.version === 4 && ipv4IsPrivate(parsed.value))) return
  // 1.1.1.1 is Cloudflare's globally anycast DNS address. IPtoASN labels
  // this anycast announcement by its US origin ASN, while its public service
  // endpoint is conventionally identified as Australian. Keep this known
  // correction local; no visitor data is sent anywhere.
  if (parsed.version === 4 && parsed.value === BigInt(0x01010101)) return "AU"
  const ranges = parsed.version === 4 ? database.ipv4 : database.ipv6
  let low = 0
  let high = ranges.length - 1
  while (low <= high) {
    const middle = (low + high) >> 1
    const [start, end, country] = ranges[middle]
    if (parsed.value < start) high = middle - 1
    else if (parsed.value > end) low = middle + 1
    else return country
  }
  return
}

async function readLocalDatabase(filename: string) {
  const bytes = await readFile(join(process.cwd(), "public", "geo", filename))
  if (bytes.byteLength > MAX_COMPRESSED_BYTES) throw new Error("IP country database is too large")
  const decompressed = gunzipSync(bytes)
  if (decompressed.byteLength > MAX_DECOMPRESSED_BYTES) throw new Error("IP country database is too large")
  return decompressed.toString("utf8")
}

async function loadDatabase(): Promise<CountryDatabase> {
  try {
    const [ipv4, ipv6] = await Promise.all([
      readLocalDatabase(DATA_FILES.ipv4),
      readLocalDatabase(DATA_FILES.ipv6),
    ])
    return parseCountryDatabase(ipv4, ipv6)
  } catch {
    return emptyDatabase()
  }
}

export async function getCountryForIp(ip: string): Promise<string | undefined> {
  try {
    const now = Date.now()
    if (!databasePromise || now >= databaseExpiresAt) {
      databaseExpiresAt = now + CACHE_TTL
      databasePromise = loadDatabase()
    }
    return lookupCountry(ip, await databasePromise)
  } catch {
    // Geolocation is optional. A failed update must never fail page rendering.
    databasePromise = Promise.resolve(emptyDatabase())
    databaseExpiresAt = Date.now() + CACHE_TTL
    return undefined
  }
}