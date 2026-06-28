import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()
const read = (path: string) => readFileSync(resolve(root, path), "utf8")

describe("generic CMS canvas defaults", () => {
  it("does not ship tenant-specific hero defaults in shared CMS blocks", () => {
    expect(read("src/blocks/Hero.ts")).not.toMatch(/Roermond|Limburg-Noord|Persoonlijke|Écht verschil/)
  })

  it("gates the Amicare live hero badges to the Amicare hero variant", () => {
    const source = read("src/components/editor/canvas/blocks/Hero.tsx")

    expect(source).toContain('block.variant === "amicareZenHero"')
    expect(source).toContain('block.analytics?.sectionVariant === "amicare-zen-hero"')
    expect(source).toContain("Écht verschil maken voor jongeren en gezinnen.")
    expect(source).toContain("Roermond e.o.")
    expect(source).toContain("Limburg-Noord")
  })

  it("uses generic canvas anchor fallbacks for shared block renderers", () => {
    const source =
      read("src/components/editor/canvas/blocks/CTA.tsx") +
      read("src/components/editor/canvas/blocks/FeatureList.tsx")

    expect(source).not.toContain('block.anchor || "werkwijze"')
    expect(source).not.toContain('block.anchor || "wat-telt"')
    expect(source).toContain('block.anchor || "features"')
    expect(source).toContain('block.anchor || (isContact ? "contact" : "cta")')
  })

  it("does not duplicate plus signs in icon-led add CTA controls", () => {
    const source =
      read("src/components/editor/canvas/blocks/CTA.tsx") +
      read("src/components/editor/canvas/blocks/Hero.tsx")

    expect(source).not.toContain('emptyLabel={`+ ${t("addCtaButton")}`}')
    expect(source).not.toContain('emptyLabel={`+ ${t("addContactLink")}`}')
  })
})
