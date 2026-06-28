import { readFile, stat } from "node:fs/promises"
import type { APIRoute } from "astro"
import { loadPublishedSnapshot, normalizeRequestHost } from "../../../lib/snapshot"
import { mediaContentType, safeTenantMediaFilePath } from "../../../lib/media"

function notFound(): Response {
  return new Response(null, {
    status: 404,
    headers: {
      "cache-control": "no-store",
    },
  })
}

async function resolveMediaResponse({ params, request, includeBody }: Parameters<APIRoute>[0] & { includeBody: boolean }) {
  const tenantId = params.tenantId
  const mediaPath = params.path
  if (!tenantId || !mediaPath) return notFound()

  const host = normalizeRequestHost(request.headers.get("x-forwarded-host") ?? request.headers.get("host"))
  const snapshot = await loadPublishedSnapshot(host)
  if (!snapshot || snapshot.tenantId !== tenantId) return notFound()

  const filePath = safeTenantMediaFilePath({ tenantId, mediaPath })
  if (!filePath) return notFound()

  try {
    const fileStat = await stat(filePath)
    if (!fileStat.isFile()) return notFound()
    const headers = {
      "cache-control": "public, max-age=3600",
      "content-length": String(fileStat.size),
      "content-type": mediaContentType(filePath),
    }
    if (!includeBody) return new Response(null, { status: 200, headers })
    return new Response(await readFile(filePath), { status: 200, headers })
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return notFound()
    throw error
  }
}

export const GET: APIRoute = (context) => resolveMediaResponse({ ...context, includeBody: true })
export const HEAD: APIRoute = (context) => resolveMediaResponse({ ...context, includeBody: false })
