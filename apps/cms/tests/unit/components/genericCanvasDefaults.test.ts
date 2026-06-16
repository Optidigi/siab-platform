import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()
const read = (path: string) => readFileSync(resolve(root, path), "utf8")

describe("generic CMS canvas defaults", () => {
  it("does not ship tenant-specific hero defaults in shared CMS blocks", () => {
    const files = [
      "src/blocks/Hero.ts",
      "src/components/editor/canvas/blocks/Hero.tsx",
    ]

    for (const file of files) {
      const source = read(file)
      expect(source).not.toMatch(/Roermond|Limburg-Noord|Persoonlijke|Écht verschil/)
    }
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
