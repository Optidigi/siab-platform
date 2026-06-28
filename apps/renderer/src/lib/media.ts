import { extname, resolve, sep } from "node:path"
import type { MediaRef } from "@siteinabox/contracts"
import type { MediaResolver, ResolvedMedia } from "@siteinabox/site-renderer"

export const PUBLIC_RENDERER_MEDIA_PREFIX = "/siab-media"

const TENANT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/

const CONTENT_TYPES: Record<string, string> = {
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
}

export function rendererDataDir(): string {
  return resolve(process.cwd(), process.env.DATA_DIR || "./.data-out")
}

export function mediaContentType(filename: string): string {
  return CONTENT_TYPES[extname(filename).toLowerCase()] ?? "application/octet-stream"
}

export function isSafeTenantId(tenantId: string): boolean {
  return TENANT_ID_PATTERN.test(tenantId) && !tenantId.includes("..")
}

export function safeTenantMediaFilePath({
  dataDir = rendererDataDir(),
  tenantId,
  mediaPath,
}: {
  dataDir?: string
  tenantId: string
  mediaPath: string
}): string | null {
  if (!isSafeTenantId(tenantId) || mediaPath.includes("\0")) return null

  const normalizedMediaPath = mediaPath.replace(/\\/g, "/").replace(/^\/+/, "")
  const segments = normalizedMediaPath.split("/")
  if (!segments.length || segments.some((segment) => !segment || segment === "." || segment === "..")) return null

  const mediaRoot = resolve(dataDir, "tenants", tenantId, "media")
  const filePath = resolve(mediaRoot, ...segments)
  if (filePath !== mediaRoot && filePath.startsWith(`${mediaRoot}${sep}`)) return filePath
  return null
}

function encodeMediaPath(mediaPath: string): string {
  return mediaPath
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .split("/")
    .map(encodeURIComponent)
    .join("/")
}

function mediaPathFromValue(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (/^[a-z][a-z\d+.-]*:/i.test(trimmed) || trimmed.startsWith("//")) return null

  const tenantMediaMatch = trimmed.match(/^\/api\/tenant-media\/[^/]+\/(.+)$/)
  if (tenantMediaMatch?.[1]) return tenantMediaMatch[1]

  if (trimmed.startsWith("/media/")) return trimmed.slice("/media/".length)
  if (!trimmed.startsWith("/")) return trimmed
  return null
}

export function publicRendererMediaPath(tenantId: string, mediaPath: string): string | null {
  if (!isSafeTenantId(tenantId)) return null
  const safePath = safeTenantMediaFilePath({ dataDir: "/", tenantId, mediaPath })
  if (!safePath) return null
  return `${PUBLIC_RENDERER_MEDIA_PREFIX}/${encodeURIComponent(tenantId)}/${encodeMediaPath(mediaPath)}`
}

export function createRendererMediaResolver(tenantId: string): MediaResolver {
  return (media: MediaRef): ResolvedMedia | string | null => {
    if (!media) return null
    if (typeof media === "number") return null

    if (typeof media === "string") {
      const mediaPath = mediaPathFromValue(media)
      return mediaPath ? publicRendererMediaPath(tenantId, mediaPath) : media
    }

    const mediaPath = typeof media.url === "string" ? mediaPathFromValue(media.url) : mediaPathFromValue(media.filename ?? "")
    if (!mediaPath) {
      if (media.url) return { src: media.url, alt: media.alt ?? undefined }
      return null
    }

    const src = publicRendererMediaPath(tenantId, mediaPath)
    return src ? { src, alt: media.alt ?? undefined } : null
  }
}
