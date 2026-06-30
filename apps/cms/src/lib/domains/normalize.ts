import "server-only"

const DOMAIN_REGEX =
  /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/

export type NormalizedDomain =
  | {
      ok: true
      domain: string
      name: string
      extension: string
      labels: string[]
    }
  | {
      ok: false
      input: string
      reason: "empty" | "invalid_format" | "invalid_tld" | "too_long"
    }

const cleanDomainInput = (value: unknown): string => {
  if (typeof value !== "string") return ""
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "")
    .replace(/\.$/, "")
}

export function normalizeDomain(value: unknown): NormalizedDomain {
  const domain = cleanDomainInput(value)
  if (!domain) return { ok: false, input: "", reason: "empty" }
  if (domain.length > 253) return { ok: false, input: domain, reason: "too_long" }
  if (!DOMAIN_REGEX.test(domain)) return { ok: false, input: domain, reason: "invalid_format" }

  const labels = domain.split(".")
  const extension = labels.at(-1) ?? ""
  if (!/[a-z]/.test(extension)) return { ok: false, input: domain, reason: "invalid_tld" }

  return {
    ok: true,
    domain,
    name: labels.slice(0, -1).join("."),
    extension,
    labels,
  }
}

export function splitDomain(value: unknown): { name: string; extension: string; domain: string } {
  const normalized = normalizeDomain(value)
  if (!normalized.ok) throw new Error(`Invalid domain: ${normalized.reason}.`)
  return {
    name: normalized.name,
    extension: normalized.extension,
    domain: normalized.domain,
  }
}
