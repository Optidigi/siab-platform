import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const root = join(process.cwd(), "src", "locales")

function readMessages(locale: "en" | "nl") {
  return JSON.parse(readFileSync(join(root, `${locale}.json`), "utf8")) as Record<string, unknown>
}

function keysOf(value: unknown, prefix = ""): string[] {
  if (value == null || typeof value !== "object" || Array.isArray(value)) return [prefix]
  return Object.entries(value as Record<string, unknown>).flatMap(([key, nested]) =>
    keysOf(nested, prefix ? `${prefix}.${key}` : key),
  )
}

function valuesOf(value: unknown): string[] {
  if (typeof value === "string") return [value]
  if (value == null || typeof value !== "object" || Array.isArray(value)) return []
  return Object.values(value as Record<string, unknown>).flatMap(valuesOf)
}

describe("locale message coverage", () => {
  it("keeps English and Dutch message keys in sync", () => {
    const enKeys = keysOf(readMessages("en")).sort()
    const nlKeys = keysOf(readMessages("nl")).sort()

    expect(nlKeys).toEqual(enKeys)
  })

  it("does not expose tenant wording in translated UI copy", () => {
    const visibleCopy = [...valuesOf(readMessages("en")), ...valuesOf(readMessages("nl"))]

    expect(visibleCopy.filter((value) => /\btenants?\b/i.test(value))).toEqual([])
  })
})
