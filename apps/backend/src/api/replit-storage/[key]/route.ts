import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";

// Public read path for files stored via the replit-storage file provider
// (see src/modules/replit-storage) - Replit Object Storage has no direct
// public URL, so every uploaded file's URL points back here, and this route
// fetches the bytes server-side and streams them to the browser.
const EXT_TO_CONTENT_TYPE: Record<string, string> = {
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".avif": "image/avif",
};

export async function GET(
  request: MedusaRequest,
  response: MedusaResponse
): Promise<void> {
  const rawKey = (request.params as Record<string, string>).key;
  let key: string;
  try {
    key = decodeURIComponent(rawKey);
  } catch {
    response.status(400).json({ message: "Invalid key" });
    return;
  }

  // No "..", no absolute paths, no null bytes - this key only ever
  // designates an object inside our own bucket, not a filesystem path, but
  // keeping the same discipline as a path costs nothing and rules out any
  // client-crafted key surprising the storage SDK.
  if (key.includes("..") || key.includes("\0") || key.startsWith("/")) {
    response.status(400).json({ message: "Invalid key" });
    return;
  }

  const ext = key.slice(key.lastIndexOf(".")).toLowerCase();
  const contentType = EXT_TO_CONTENT_TYPE[ext];
  if (!contentType) {
    response.status(400).json({ message: "Unsupported file type" });
    return;
  }

  // getAsBuffer on the module service itself takes a Medusa file entity ID
  // ("file_123"), not a raw provider key - going through getProvider() calls
  // our own service's getAsBuffer({fileKey}) directly, matching what `key`
  // here actually is (the provider-level key returned from upload()).
  const fileModuleService = request.scope.resolve(Modules.FILE);
  try {
    const buffer = await fileModuleService.getProvider().getAsBuffer({ fileKey: key });
    response.setHeader("Content-Type", contentType);
    response.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    response.status(200).send(buffer);
  } catch (e: any) {
    response.status(404).json({ message: "Not found" });
  }
}
