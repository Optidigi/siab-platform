import type { PublishedSiteSnapshot } from "@siteinabox/contracts/generation"
import { PublishedSiteSnapshotSchema } from "@siteinabox/contracts/generation"

export type RetargetPublishedSnapshotOptions = {
  tenantId: string | number
  tenantSlug: string
  domain: string
  siteUrl?: string
  mediaBaseUrl?: string | null
  aliases?: Array<{ host: string }>
  manifestVersion?: number
  publishedAt?: string
}

const mediaUrlKeys = new Set(["ogImage", "url"])

function absolutizeRootRelativeUrl(value: string, baseUrl: string): string {
  if (!value.startsWith("/") || value.startsWith("//")) return value
  return new URL(value, baseUrl).toString()
}

function rewriteRelativeMediaUrls(value: unknown, mediaBaseUrl: string): unknown {
  if (Array.isArray(value)) return value.map((item) => rewriteRelativeMediaUrls(item, mediaBaseUrl))
  if (!value || typeof value !== "object") return value

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => {
      if (typeof entry === "string" && mediaUrlKeys.has(key)) {
        return [key, absolutizeRootRelativeUrl(entry, mediaBaseUrl)]
      }
      return [key, rewriteRelativeMediaUrls(entry, mediaBaseUrl)]
    }),
  )
}

export function retargetPublishedSiteSnapshot(
  source: PublishedSiteSnapshot,
  options: RetargetPublishedSnapshotOptions,
): PublishedSiteSnapshot {
  const siteUrl = options.siteUrl ?? `https://${options.domain}`
  const tenantId = String(options.tenantId)
  const snapshot = structuredClone(source)

  snapshot.tenantId = tenantId
  snapshot.tenantSlug = options.tenantSlug
  snapshot.domain = options.domain
  snapshot.siteUrl = siteUrl
  snapshot.publishedAt = options.publishedAt ?? snapshot.publishedAt
  snapshot.manifest = {
    ...snapshot.manifest,
    tenantId,
    version: options.manifestVersion ?? snapshot.manifest.version,
  }
  snapshot.settings = {
    ...snapshot.settings,
    siteUrl,
    aliases: options.aliases ?? snapshot.settings.aliases,
    seoJsonLd: snapshot.settings.seoJsonLd
      ? {
          ...snapshot.settings.seoJsonLd,
          organization: snapshot.settings.seoJsonLd.organization
            ? {
                ...snapshot.settings.seoJsonLd.organization,
                url: siteUrl,
              }
            : snapshot.settings.seoJsonLd.organization,
        }
      : snapshot.settings.seoJsonLd,
  }

  const retargetedSnapshot = options.mediaBaseUrl
    ? rewriteRelativeMediaUrls(snapshot, options.mediaBaseUrl)
    : snapshot

  return PublishedSiteSnapshotSchema.parse(retargetedSnapshot)
}
