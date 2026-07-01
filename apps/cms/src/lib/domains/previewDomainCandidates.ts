const DOMAIN_REGEX =
  /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/

const suffixModifiers = ["online", "site", "web", "studio", "zorg", "praktijk", "groep", "hq"]
const prefixModifiers = ["mijn", "de", "het"]
const trailingBusinessWords = ["web", "site", "online", "studio", "zorg", "care", "praktijk", "clinic", "groep", "hq"]

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

const normalizeCandidateDomain = (value: unknown): {
  ok: true
  domain: string
  name: string
  extension: string
} | {
  ok: false
} => {
  const domain = cleanDomainInput(value)
  if (!domain || domain.length > 253 || !DOMAIN_REGEX.test(domain)) return { ok: false }
  const labels = domain.split(".")
  const extension = labels.at(-1) ?? ""
  if (!/[a-z]/.test(extension)) return { ok: false }
  return {
    ok: true,
    domain,
    name: labels.slice(0, -1).join("."),
    extension,
  }
}

const titleCase = (value: string): string => value ? `${value[0]?.toUpperCase() ?? ""}${value.slice(1)}` : value

export const previewDomainCandidates = (domain: string): string[] => {
  const normalized = normalizeCandidateDomain(domain)
  if (!normalized.ok) return []
  const [name, extension] = [normalized.name, normalized.extension]
  const compactName = name.replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")
  if (!compactName) return []

  const candidates = new Set<string>()
  const parts = compactName.split("-").filter(Boolean)
  const joined = parts.join("")
  const spaced = parts.join("-")
  const roots = new Set<string>([compactName, joined, spaced])

  for (const suffix of trailingBusinessWords) {
    for (const root of [...roots]) {
      if (root.endsWith(suffix) && root.length > suffix.length + 2) {
        const trimmed = root.slice(0, -suffix.length).replace(/-+$/g, "")
        if (trimmed) roots.add(trimmed)
      }
    }
  }

  for (const root of roots) {
    candidates.add(`${root}.${extension}`)
    for (const modifier of suffixModifiers) {
      candidates.add(`${root}${modifier}.${extension}`)
      candidates.add(`${root}-${modifier}.${extension}`)
    }
    for (const modifier of prefixModifiers) {
      candidates.add(`${modifier}${root}.${extension}`)
      candidates.add(`${modifier}-${root}.${extension}`)
    }
  }

  if (parts.length > 1) {
    candidates.add(`${[...parts].reverse().join("-")}.${extension}`)
    candidates.add(`${parts.at(0)}${parts.slice(1).map(titleCase).join("")}.${extension}`)
  }
  return [...candidates].filter((candidate) => candidate !== normalized.domain).slice(0, 48)
}
