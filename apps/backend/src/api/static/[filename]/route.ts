import { access } from "node:fs/promises";
import path from "node:path";
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

const IMAGE_EXTENSIONS = new Set([
  ".avif",
  ".gif",
  ".jpeg",
  ".jpg",
  ".png",
  ".svg",
  ".webp",
]);

function getStaticDirectories(): string[] {
  const workingDirectory = process.cwd();
  const isBuiltServer =
    path.basename(workingDirectory) === "server" &&
    path.basename(path.dirname(workingDirectory)) === ".medusa";
  const backendRoot = isBuiltServer
    ? path.resolve(workingDirectory, "../..")
    : workingDirectory;

  return [
    path.resolve(backendRoot, "static"),
    path.resolve(workingDirectory, "static"),
  ];
}

export async function GET(
  request: MedusaRequest,
  response: MedusaResponse
): Promise<void> {
  const filename = request.params.filename;
  if (
    !filename ||
    path.basename(filename) !== filename ||
    filename.startsWith("private-") ||
    !IMAGE_EXTENSIONS.has(path.extname(filename).toLowerCase())
  ) {
    response.sendStatus(404);
    return;
  }

  for (const directory of getStaticDirectories()) {
    const filePath = path.resolve(directory, filename);
    if (!filePath.startsWith(`${directory}${path.sep}`)) {
      continue;
    }

    try {
      await access(filePath);
      response.setHeader("Cache-Control", "public, max-age=86400");
      response.sendFile(filePath);
      return;
    } catch {
      // The built server and source project may use different static folders.
    }
  }

  response.sendStatus(404);
}