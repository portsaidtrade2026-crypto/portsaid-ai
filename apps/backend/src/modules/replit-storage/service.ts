import { Client } from "@replit/object-storage";
import { Logger } from "@medusajs/framework/types";
import {
  AbstractFileProviderService,
  MedusaError,
} from "@medusajs/framework/utils";
import {
  ProviderDeleteFileDTO,
  ProviderFileResultDTO,
  ProviderGetFileDTO,
  ProviderUploadFileDTO,
} from "@medusajs/framework/types";
import { randomUUID } from "crypto";
import path from "path";

// Persists uploaded files (product images, etc.) to Replit's own Object
// Storage (GCS-backed) instead of local disk. Local-disk storage doesn't
// survive across the dev workspace and the separate production deployment -
// files uploaded from one are invisible to the other, and Autoscale gives
// production a fresh filesystem on every republish anyway. Object Storage is
// shared and durable across both.
//
// The SDK (@replit/object-storage) has no "public URL" concept - reads are
// server-side only (downloadAsBytes/Stream) - so `upload` returns a URL
// pointing at this app's own /replit-storage/:key route (see
// src/api/replit-storage/[key]/route.ts), which streams the bytes back with
// the right Content-Type. Auth is automatic in any Replit environment (dev
// or deployed) via Replit's own sidecar credentials - no access keys needed.

type InjectedDependencies = {
  logger: Logger;
};

// Mirrors @medusajs/file-s3's own decodeFileContent: upload content isn't
// reliably base64 - it can be a UTF-8 text string (e.g. a CSV) or a
// binary/latin1 string (an image via buffer.toString("binary"), which the
// upload docs themselves instruct). Trusting it as pure base64 silently
// corrupts every byte > 127 in an actual base64-encoded image.
function decodeFileContent(content: string, mimeType?: string): Buffer {
  const decodedBase64 = Buffer.from(content, "base64");
  if (decodedBase64.toString("base64") === content) {
    return decodedBase64;
  }

  const isTextContent =
    mimeType?.startsWith("text/") ||
    mimeType?.includes("csv") ||
    mimeType?.includes("json") ||
    mimeType?.includes("xml");

  return isTextContent
    ? Buffer.from(content, "utf8")
    : Buffer.from(content, "binary");
}

function sanitizeFilename(filename: string): string {
  const cleaned = filename.replace(/\\/g, "/").replace(/^\/+/, "");
  const normalized = path.posix.normalize(cleaned);
  return normalized
    .split("/")
    .filter((seg) => seg !== ".." && seg !== ".")
    .join("/");
}

export default class ReplitStorageService extends AbstractFileProviderService {
  static identifier = "replit-storage";
  protected logger_: Logger;
  protected client_: Client;

  constructor({ logger }: InjectedDependencies) {
    super();
    this.logger_ = logger;
    this.client_ = new Client();
  }

  async upload(file: ProviderUploadFileDTO): Promise<ProviderFileResultDTO> {
    if (!file?.filename) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "No filename provided");
    }

    const sanitized = sanitizeFilename(file.filename);
    const parsed = path.posix.parse(sanitized);
    const key = `${parsed.dir ? `${parsed.dir}/` : ""}${parsed.name}-${randomUUID()}${parsed.ext}`;

    const buffer = decodeFileContent(file.content, file.mimeType);
    const { error } = await this.client_.uploadFromBytes(key, buffer);
    if (error) {
      this.logger_.error(`replit-storage upload failed: ${error.message}`);
      throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, error.message);
    }

    // The whole key (which may contain "/") is encoded as a SINGLE path
    // segment (encodeURIComponent turns "/" into "%2F") rather than several
    // segments, so the serving route can be a plain single [key] dynamic
    // route instead of relying on catch-all-segment routing.
    return {
      url: `/replit-storage/${encodeURIComponent(key)}`,
      key,
    };
  }

  async delete(
    files: ProviderDeleteFileDTO | ProviderDeleteFileDTO[]
  ): Promise<void> {
    const list = Array.isArray(files) ? files : [files];
    for (const f of list) {
      const { error } = await this.client_.delete(f.fileKey, {
        ignoreNotFound: true,
      });
      if (error) {
        this.logger_.error(`replit-storage delete failed: ${error.message}`);
      }
    }
  }

  async getAsBuffer(file: ProviderGetFileDTO): Promise<Buffer> {
    const { result, error } = await this.client_.downloadAsBytes(file.fileKey);
    if (error) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, error.message);
    }
    return result[0];
  }

  async getPresignedDownloadUrl(file: ProviderGetFileDTO): Promise<string> {
    // No presigned/time-limited URL support in the Replit SDK - the app's
    // own serving route is the only read path, so just return it.
    return `/replit-storage/${encodeURIComponent(file.fileKey)}`;
  }
}
