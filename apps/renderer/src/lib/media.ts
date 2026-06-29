import { extname, resolve, sep } from "node:path"
import {
  encodeMediaPath,
  isSafeTenantId,
  isSafeTenantMediaPath,
} from "@siteinabox/site-renderer"

export {
  PUBLIC_RENDERER_MEDIA_PREFIX,
  createRendererMediaResolver,
  publicRendererMediaPath,
} from "@siteinabox/site-renderer"

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

export function cmsRendererMediaEndpoint(tenantId: string, mediaPath: string): URL | null {
  const baseUrl = process.env.SIAB_CMS_URL
  if (!baseUrl || !isSafeTenantId(tenantId) || !isSafeTenantMediaPath(mediaPath)) return null

  const url = new URL(
    `/api/renderer/media/${encodeURIComponent(tenantId)}/${encodeMediaPath(mediaPath)}`,
    baseUrl,
  )
  return url
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
