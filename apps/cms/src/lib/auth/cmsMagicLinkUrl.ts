import { canonicalizeMagicLinkUrl } from "@/lib/auth/magicLinkUrl"
import { getCmsAuthFallbackOrigin, getTrustedSocialAuthOrigins } from "@/lib/socialAuth/hosts"

const DEFAULT_CMS_ORIGIN = "https://admin.siteinabox.nl"

type HeaderRecord = Record<string, string | string[] | undefined>

const isHeaders = (value: unknown): value is Headers =>
  typeof Headers !== "undefined" && value instanceof Headers

const isRequest = (value: unknown): value is Request =>
  typeof Request !== "undefined" && value instanceof Request

const isHeaderRecord = (value: unknown): value is HeaderRecord =>
  Boolean(value) && typeof value === "object" && !isHeaders(value)

const appendHeader = (headers: Headers, key: string, value: string | string[] | undefined) => {
  if (Array.isArray(value)) {
    const firstValue = value.find((item) => item.trim())
    if (firstValue) headers.set(key, firstValue)
    return
  }
  if (value) headers.set(key, value)
}

const headersFrom = (value: unknown): Headers | null => {
  if (!value) return null
  if (isHeaders(value)) return new Headers(value)
  if (!isHeaderRecord(value)) return null

  const headers = new Headers()
  for (const [key, headerValue] of Object.entries(value)) {
    appendHeader(headers, key, headerValue)
  }
  return headers
}

const contextHeaders = (ctx: unknown): Headers | null => {
  if (!ctx || typeof ctx !== "object") return null
  if (isRequest(ctx)) return new Headers(ctx.headers)

  const value = ctx as {
    request?: unknown
    headers?: unknown
    context?: { request?: unknown; headers?: unknown }
  }

  if (isRequest(value.request)) return new Headers(value.request.headers)
  return (
    headersFrom(value.headers) ??
    headersFrom((value.request as { headers?: unknown } | undefined)?.headers) ??
    headersFrom(value.context?.headers) ??
    headersFrom((value.context?.request as { headers?: unknown } | undefined)?.headers)
  )
}

const requestFromContext = (ctx: unknown): Request | undefined => {
  const headers = contextHeaders(ctx)
  if (!headers) return undefined

  const host = headers.get("x-forwarded-host") || headers.get("host")
  if (!host) return undefined

  const proto = headers.get("x-forwarded-proto") === "http" ? "http" : "https"
  return new Request(`${proto}://${host}/api/auth/magic-link`, { headers })
}

export const canonicalizeCmsMagicLinkUrl = async (url: string, ctx?: unknown): Promise<string> => {
  const request = requestFromContext(ctx)
  const trustedOrigins = request ? await getTrustedSocialAuthOrigins(request) : []
  const origin = trustedOrigins[0] ?? getCmsAuthFallbackOrigin() ?? DEFAULT_CMS_ORIGIN
  return canonicalizeMagicLinkUrl(url, origin)
}
