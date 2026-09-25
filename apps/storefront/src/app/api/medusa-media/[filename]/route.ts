const IMAGE_EXTENSIONS = new Set([
  ".avif",
  ".gif",
  ".jpeg",
  ".jpg",
  ".png",
  ".svg",
  ".webp",
])

type RouteContext = {
  params: Promise<{ filename: string }>
}

export async function GET(
  _request: Request,
  { params }: RouteContext
): Promise<Response> {
  const { filename } = await params
  const extension = filename.slice(filename.lastIndexOf(".")).toLowerCase()

  if (
    !filename ||
    filename.includes("/") ||
    filename.includes("\\") ||
    filename.toLowerCase().startsWith("private-") ||
    !IMAGE_EXTENSIONS.has(extension)
  ) {
    return new Response(null, { status: 404 })
  }

  const backendUrl =
    process.env.MEDUSA_BACKEND_URL ||
    process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
    "http://localhost:9000"

  let upstream: Response
  try {
    const imageUrl = new URL(
      `/static/${encodeURIComponent(filename)}`,
      backendUrl
    )
    upstream = await fetch(imageUrl, { cache: "force-cache" })
  } catch {
    return new Response(null, { status: 502 })
  }

  if (!upstream.ok) {
    return new Response(null, {
      status: upstream.status === 404 ? 404 : 502,
    })
  }

  const contentType = upstream.headers.get("content-type")
  if (!contentType?.toLowerCase().startsWith("image/")) {
    return new Response(null, { status: 415 })
  }

  return new Response(upstream.body, {
    headers: {
      "Cache-Control": "public, max-age=86400",
      "Content-Type": contentType,
      "X-Content-Type-Options": "nosniff",
    },
  })
}