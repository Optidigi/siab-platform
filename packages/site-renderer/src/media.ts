import type { MediaRef } from "@siteinabox/contracts"

export const PUBLIC_RENDERER_MEDIA_PREFIX = "/siab-media"

const TENANT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/

export type ResolvedMedia = {
  src: string
  alt?: string
}

export type MediaResolver = (media: MediaRef) => ResolvedMedia | string | null | undefined

export function defaultMediaResolver(media: MediaRef): ResolvedMedia | null {
  if (!media) return null
  if (typeof media === "string") return { src: media }
  if (typeof media === "number") return null
  if (media.url) return { src: media.url, alt: media.alt ?? undefined }
  if (media.filename) return { src: `/media/${media.filename}`, alt: media.alt ?? undefined }
  return null
}

export function resolveMedia(media: MediaRef, resolver?: MediaResolver): ResolvedMedia | null {
  const resolved = resolver ? resolver(media) : defaultMediaResolver(media)
  if (!resolved) return null
  if (typeof resolved === "string") return { src: resolved }
  return resolved
}

export function isSafeTenantId(tenantId: string): boolean {
  return TENANT_ID_PATTERN.test(tenantId) && !tenantId.includes("..")
}

export function mediaPathFromValue(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (/^[a-z][a-z\d+.-]*:/i.test(trimmed) || trimmed.startsWith("//")) return null

  const tenantMediaMatch = trimmed.match(/^\/api\/tenant-media\/[^/]+\/(.+)$/)
  if (tenantMediaMatch?.[1]) return tenantMediaMatch[1]

  if (trimmed.startsWith("/siab-media/")) {
    const [, , _tenantId, ...mediaSegments] = trimmed.split("/")
    return mediaSegments.length ? mediaSegments.join("/") : null
  }
  if (trimmed.startsWith("/media/")) return trimmed.slice("/media/".length)
  if (!trimmed.startsWith("/")) return trimmed
  return null
}

export function encodeMediaPath(mediaPath: string): string {
  return mediaPath
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .split("/")
    .map(encodeURIComponent)
    .join("/")
}

export function isSafeTenantMediaPath(mediaPath: string): boolean {
  if (mediaPath.includes("\0")) return false
  const segments = mediaPath.replace(/\\/g, "/").replace(/^\/+/, "").split("/")
  return Boolean(segments.length) && segments.every((segment) => segment && segment !== "." && segment !== "..")
}

export function publicRendererMediaPath(tenantId: string, mediaPath: string): string | null {
  if (!isSafeTenantId(tenantId) || !isSafeTenantMediaPath(mediaPath)) return null
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

    const mediaPath = (
      typeof media.url === "string" ? mediaPathFromValue(media.url) : null
    ) ?? mediaPathFromValue(media.filename ?? "")
    if (!mediaPath) {
      if (media.url) return { src: media.url, alt: media.alt ?? undefined }
      return null
    }

    const src = publicRendererMediaPath(tenantId, mediaPath)
    return src ? { src, alt: media.alt ?? undefined } : null
  }
}
