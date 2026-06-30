import "server-only"
import { splitDomain } from "@/lib/domains/normalize"

export type CloudflareZoneResult = {
  id: string
  name: string
  nameServers: string[]
  raw: unknown
}

export type CloudflareDnsRecordType = "A" | "CNAME"

export type CloudflareDnsRecordRequest = {
  type: CloudflareDnsRecordType
  name: string
  content: string
  ttl: number
  proxied: boolean
}

export type CloudflareDnsRecordResult = {
  id: string | null
  type: CloudflareDnsRecordType
  name: string
  content: string
  proxied: boolean
  raw: unknown
}

type FetchLike = typeof fetch

type CloudflareOptions = {
  env?: NodeJS.ProcessEnv
  fetchImpl?: FetchLike
}

const DEFAULT_API_BASE = "https://api.cloudflare.com/client/v4"

export class CloudflareApiError extends Error {
  status: number
  operation: string

  constructor(operation: string, status: number) {
    super(`${operation} failed with HTTP ${status}.`)
    this.name = "CloudflareApiError"
    this.status = status
    this.operation = operation
  }
}

const cleanEnv = (value: string | undefined): string | null => {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

const apiBase = (env: NodeJS.ProcessEnv): string =>
  (cleanEnv(env.CLOUDFLARE_API_BASE_URL) ?? DEFAULT_API_BASE).replace(/\/+$/, "")

const fetcher = (options?: CloudflareOptions): FetchLike => options?.fetchImpl ?? globalThis.fetch

const readObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}

const json = async (response: Response): Promise<unknown> => {
  const text = await response.text()
  if (!text) return null
  return JSON.parse(text) as unknown
}

const resultObject = (value: unknown): Record<string, unknown> => readObject(readObject(value).result)

export function requireCloudflareConfig(env: NodeJS.ProcessEnv = process.env): { token: string; accountId: string } {
  const token = cleanEnv(env.CLOUDFLARE_API_TOKEN)
  const accountId = cleanEnv(env.CLOUDFLARE_ACCOUNT_ID)
  if (!token || !accountId) throw new Error("CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID are required.")
  return { token, accountId }
}

const headers = (token: string): Record<string, string> => ({
  Authorization: `Bearer ${token}`,
  Accept: "application/json",
  "Content-Type": "application/json",
})

export async function createCloudflareZone(domainInput: string, options?: CloudflareOptions): Promise<CloudflareZoneResult> {
  const env = options?.env ?? process.env
  const { token, accountId } = requireCloudflareConfig(env)
  const domain = splitDomain(domainInput)
  const response = await fetcher(options)(`${apiBase(env)}/zones`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({
      account: { id: accountId },
      name: domain.domain,
      type: "full",
    }),
  })
  if (!response.ok) throw new CloudflareApiError("Cloudflare zone creation", response.status)

  const payload = await json(response)
  const result = resultObject(payload)
  const id = typeof result.id === "string" ? result.id : null
  const name = typeof result.name === "string" ? result.name : domain.domain
  const nameServers = Array.isArray(result.name_servers)
    ? result.name_servers.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
    : []
  if (!id) throw new Error("Cloudflare zone creation response did not include a zone id.")
  if (nameServers.length === 0) throw new Error("Cloudflare zone creation response did not include nameservers.")

  return { id, name, nameServers, raw: payload }
}

export function buildCloudflareDnsRecordRequests(
  domainInput: string,
  env: NodeJS.ProcessEnv = process.env,
  input?: { ttl?: number; proxied?: boolean },
): CloudflareDnsRecordRequest[] {
  const domain = splitDomain(domainInput)
  const targetHost = cleanEnv(env.SIAB_RENDERER_TARGET_HOST)
  const targetIp = cleanEnv(env.SIAB_RENDERER_TARGET_IP)
  if (!targetHost && !targetIp) {
    throw new Error("SIAB_RENDERER_TARGET_HOST or SIAB_RENDERER_TARGET_IP is required for Cloudflare DNS records.")
  }

  const ttl = input?.ttl ?? 1
  const proxied = input?.proxied ?? true
  if (targetIp) {
    return [
      { type: "A", name: domain.domain, content: targetIp, ttl, proxied },
      { type: "CNAME", name: `www.${domain.domain}`, content: domain.domain, ttl, proxied },
    ]
  }

  return [
    { type: "CNAME", name: domain.domain, content: targetHost as string, ttl, proxied },
    { type: "CNAME", name: `www.${domain.domain}`, content: domain.domain, ttl, proxied },
  ]
}

export async function createCloudflareDnsRecord(
  zoneId: string,
  record: CloudflareDnsRecordRequest,
  options?: CloudflareOptions,
): Promise<CloudflareDnsRecordResult> {
  const env = options?.env ?? process.env
  const { token } = requireCloudflareConfig(env)
  const response = await fetcher(options)(`${apiBase(env)}/zones/${encodeURIComponent(zoneId)}/dns_records`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify(record),
  })
  if (!response.ok) throw new CloudflareApiError("Cloudflare DNS record creation", response.status)

  const payload = await json(response)
  const result = resultObject(payload)
  return {
    id: typeof result.id === "string" ? result.id : null,
    type: record.type,
    name: typeof result.name === "string" ? result.name : record.name,
    content: typeof result.content === "string" ? result.content : record.content,
    proxied: typeof result.proxied === "boolean" ? result.proxied : record.proxied,
    raw: payload,
  }
}

export async function createCloudflareZoneDnsRecords(
  zoneId: string,
  domainInput: string,
  options?: CloudflareOptions & { ttl?: number; proxied?: boolean },
): Promise<CloudflareDnsRecordResult[]> {
  const env = options?.env ?? process.env
  const records = buildCloudflareDnsRecordRequests(domainInput, env, {
    ttl: options?.ttl,
    proxied: options?.proxied,
  })
  const results: CloudflareDnsRecordResult[] = []
  for (const record of records) {
    results.push(await createCloudflareDnsRecord(zoneId, record, options))
  }
  return results
}
