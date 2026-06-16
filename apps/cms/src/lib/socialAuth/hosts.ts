import { getPayload } from "payload"
import config from "@/payload.config"
import { isSuperAdminDomain, stripAdminPrefix } from "@/lib/hostToTenant"

const splitList = (value: string | undefined): string[] =>
  (value ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)

const normalizeHost = (value: string | null): string => {
  const host = (value ?? "").split(",")[0]?.trim().toLowerCase() ?? ""
  if (host.startsWith("[")) return host
  return host.split(":")[0] ?? host
}

const requestHost = (request: Request): string =>
  normalizeHost(request.headers.get("x-forwarded-host") || request.headers.get("host"))

const requestProtocol = (request: Request): "http" | "https" => {
  const forwardedProto = request.headers.get("x-forwarded-proto")
  if (forwardedProto === "http" || forwardedProto === "https") return forwardedProto
  try {
    const protocol = new URL(request.url).protocol
    return protocol === "http:" ? "http" : "https"
  } catch {
    return "https"
  }
}

const isLoopbackHost = (host: string): boolean =>
  host === "localhost" || host.endsWith(".localhost") || host.startsWith("127.")

const isExtraAllowedHost = (host: string): boolean =>
  splitList(process.env.BETTER_AUTH_ALLOWED_HOSTS).includes(host)

export function getBetterAuthBaseURL() {
  const allowedHosts = [
    "admin.*",
    "localhost:*",
    "127.0.0.1:*",
    ...splitList(process.env.BETTER_AUTH_ALLOWED_HOSTS),
  ]

  return {
    allowedHosts: Array.from(new Set(allowedHosts)),
    protocol: process.env.NODE_ENV === "development" ? "http" : "https",
  } as const
}

export async function isAllowedSocialAuthHost(request: Request): Promise<boolean> {
  const host = requestHost(request)
  if (!host) return false

  if (process.env.NODE_ENV === "development" && isLoopbackHost(host)) return true
  if (isExtraAllowedHost(host)) return true

  const domain = stripAdminPrefix(host)
  if (isSuperAdminDomain(domain, process.env.NEXT_PUBLIC_SUPER_ADMIN_DOMAIN)) return true

  if (!host.startsWith("admin.")) return false

  const payload = await getPayload({ config })
  const tenants = await payload.find({
    collection: "tenants",
    where: { domain: { equals: domain } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const tenant = tenants.docs[0]
  return Boolean(tenant && tenant.status !== "suspended" && tenant.status !== "archived")
}

export async function getTrustedSocialAuthOrigins(request?: Request): Promise<string[]> {
  if (!request) return []
  if (!(await isAllowedSocialAuthHost(request))) return []
  return [`${requestProtocol(request)}://${requestHost(request)}`]
}
