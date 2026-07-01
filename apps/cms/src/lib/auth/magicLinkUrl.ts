const INTERNAL_LINK_HOSTS = new Set(["0.0.0.0", "localhost", "127.0.0.1", "::1"])
const CALLBACK_PARAMS = ["callbackURL", "newUserCallbackURL", "errorCallbackURL"] as const

const isInternalLinkHost = (host: string): boolean =>
  INTERNAL_LINK_HOSTS.has(host) || host.startsWith("127.") || host.endsWith(".localhost")

const normalizeCallbackURL = (value: string, origin: string): string => {
  try {
    const url = new URL(value, origin)
    if (url.protocol !== "http:" && url.protocol !== "https:") return "/"
    if (url.origin !== origin || isInternalLinkHost(url.hostname)) return "/"
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return "/"
  }
}

export const canonicalizeMagicLinkUrl = (url: string, origin: string): string => {
  const parsed = new URL(url, origin)
  const canonical = new URL(`${parsed.pathname}${parsed.search}${parsed.hash}`, origin)

  for (const key of CALLBACK_PARAMS) {
    const value = canonical.searchParams.get(key)
    if (value) canonical.searchParams.set(key, normalizeCallbackURL(value, origin))
  }

  return canonical.toString()
}
