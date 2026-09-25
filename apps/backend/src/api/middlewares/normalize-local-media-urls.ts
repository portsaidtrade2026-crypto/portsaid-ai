import type { NextFunction } from "express";
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

export function normalizeLocalMediaUrl(value: string): string {
  try {
    const url = new URL(value);
    if (
      url.protocol === "http:" &&
      LOCAL_HOSTS.has(url.hostname) &&
      url.port === "9000" &&
      url.pathname.startsWith("/static/") &&
      !url.pathname.startsWith("/static/private-")
    ) {
      return `${url.pathname}${url.search}${url.hash}`;
    }
  } catch {
    // Non-URL strings are left unchanged.
  }

  return value;
}

function normalizeValue(value: unknown): unknown {
  if (typeof value === "string") {
    return normalizeLocalMediaUrl(value);
  }

  if (Array.isArray(value)) {
    return value.map(normalizeValue);
  }

  if (value && typeof value === "object") {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      return value;
    }

    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [key, normalizeValue(nested)])
    );
  }

  return value;
}

export function normalizeLocalMediaUrlsMiddleware(
  _request: MedusaRequest,
  response: MedusaResponse,
  next: NextFunction
): void {
  const originalJson = response.json.bind(response);
  response.json = ((body: unknown) =>
    originalJson(normalizeValue(body) as never)) as typeof response.json;
  next();
}