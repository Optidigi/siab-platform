export const locales = ["en", "nl"] as const
export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = "nl"
export const localeCookieName = "siab-locale"

export const localeLabels: Record<Locale, string> = {
  en: "English",
  nl: "Nederlands",
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value)
}

export function normaliseLocale(value: unknown): Locale | null {
  if (isLocale(value)) return value
  if (typeof value !== "string") return null
  const base = value.toLowerCase().split("-")[0]
  return isLocale(base) ? base : null
}

export function localeFromAcceptLanguage(header: string | null | undefined): Locale | null {
  if (!header) return null
  const candidates = header
    .split(",")
    .map((part) => {
      const [rawLocale, rawQ] = part.trim().split(";q=")
      const q = rawQ ? Number.parseFloat(rawQ) : 1
      return { locale: normaliseLocale(rawLocale), q: Number.isFinite(q) ? q : 0 }
    })
    .filter((entry): entry is { locale: Locale; q: number } => entry.locale != null)
    .sort((a, b) => b.q - a.q)

  return candidates[0]?.locale ?? null
}

export function resolveLocale(...candidates: unknown[]): Locale {
  for (const candidate of candidates) {
    const locale = normaliseLocale(candidate)
    if (locale) return locale
  }
  return defaultLocale
}
