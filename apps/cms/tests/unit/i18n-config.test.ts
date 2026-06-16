import { describe, expect, it } from "vitest"
import { defaultLocale, localeFromAcceptLanguage, normaliseLocale, resolveLocale } from "@/i18n/config"

describe("i18n locale config", () => {
  it("normalises supported regional variants to their base locale", () => {
    expect(normaliseLocale("nl-NL")).toBe("nl")
    expect(normaliseLocale("en-US")).toBe("en")
    expect(normaliseLocale("de-DE")).toBeNull()
  })

  it("uses Accept-Language quality values when resolving browser locale", () => {
    expect(localeFromAcceptLanguage("de-DE,de;q=0.9,nl-NL;q=0.8,en;q=0.7")).toBe("nl")
    expect(localeFromAcceptLanguage("en-US;q=0.4,nl;q=0.9")).toBe("nl")
  })

  it("falls back to the default locale when no candidate is supported", () => {
    expect(resolveLocale("fr", null, undefined)).toBe(defaultLocale)
  })
})
