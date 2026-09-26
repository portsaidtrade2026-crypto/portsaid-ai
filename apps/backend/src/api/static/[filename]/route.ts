import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";

// Serves files written by the @medusajs/file-local provider (FILE_PROVIDER=
// local - see medusa-config.ts). Recent Medusa versions no longer register a
// built-in static file server, so uploaded images 404 on the URL the
// provider itself generates (http://.../static/<filename>) unless something
// serves that path - this route is that something. Mirrors
// src/api/replit-storage/[key]/route.ts, which does the same thing for the
// Replit deployment's file provider.
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
  const rawFilename = (request.params as Record<string, string>).filename;
  let filename: string;
  try {
    filename = decodeURIComponent(rawFilename);
  } catch {
    response.status(400).json({ message: "Invalid filename" });
    return;
  }

  if (
    filename.includes("..") ||
    filename.includes("\0") ||
    filename.startsWith("/") ||
    filename.toLowerCase().startsWith("private-")
  ) {
    response.status(400).json({ message: "Invalid filename" });
    return;
  }

  const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase();
  const contentType = EXT_TO_CONTENT_TYPE[ext];
  if (!contentType) {
    response.status(400).json({ message: "Unsupported file type" });
    return;
  }

  const fileModuleService = request.scope.resolve(Modules.FILE);
  try {
    const buffer = await fileModuleService
      .getProvider()
      .getAsBuffer({ fileKey: filename });
    response.setHeader("Content-Type", contentType);
    response.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    response.status(200).send(buffer);
  } catch (e: any) {
    response.status(404).json({ message: "Not found" });
  }
}
