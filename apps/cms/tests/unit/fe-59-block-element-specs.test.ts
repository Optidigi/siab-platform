import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { BLOCK_ELEMENTS, getBlockElementSpecs } from "@/components/editor/canvas/blockElements"

/**
 * FE-59 regression guard: every `elementPath` a canvas block renderer hands to
 * an inline-edit primitive must resolve to an ElementSpec in BLOCK_ELEMENTS.
 * A selectable element with no matching spec falls through the inspector to
 * "No editor for this element." — on mobile and the desktop sidebar alike.
 */

const BLOCKS_DIR = join(process.cwd(), "src/components/editor/canvas/blocks")

// file → blockType, mirrors the switch in canvas-block-renderer.tsx
const BLOCK_FILES: Record<string, string> = {
  "Hero.tsx": "hero",
  "FeatureList.tsx": "featureList",
  "CTA.tsx": "cta",
  "RichText.tsx": "richText",
  "ContactSection.tsx": "contactSection",
  "FAQ.tsx": "faq",
  "Testimonials.tsx": "testimonials",
}

type Ref = { field: string; subField?: string; line: number }

function extractElementPaths(src: string): Ref[] {
  const refs: Ref[] = []
  src.split("\n").forEach((line, i) => {
    const body = line.match(/elementPath=\{\{([^}]*)\}\}/)?.[1]
    if (!body) return
    const field = body.match(/field:\s*"([^"]+)"/)?.[1]
    const subField = body.match(/subField:\s*"([^"]+)"/)?.[1]
    if (field) refs.push({ field, subField, line: i + 1 })
  })
  return refs
}

describe("FE-59 — canvas elementPath ↔ BLOCK_ELEMENTS coverage", () => {
  for (const [file, blockType] of Object.entries(BLOCK_FILES)) {
    it(`${file} (${blockType}): every elementPath resolves to a spec`, () => {
      const refs = extractElementPaths(readFileSync(join(BLOCKS_DIR, file), "utf8"))
      expect(refs.length).toBeGreaterThan(0)
      const specs = BLOCK_ELEMENTS[blockType] ?? []
      for (const ref of refs) {
        const parent = specs.find((s) => s.field === ref.field)
        expect(
          parent,
          `${file}:${ref.line} field "${ref.field}" has no ElementSpec in BLOCK_ELEMENTS.${blockType}`,
        ).toBeDefined()
        if (ref.subField) {
          expect(
            parent!.kind,
            `${file}:${ref.line} field "${ref.field}" must be kind:"array" to hold subField "${ref.subField}"`,
          ).toBe("array")
          expect(
            parent!.itemFields?.find((s) => s.field === ref.subField),
            `${file}:${ref.line} subField "${ref.subField}" has no itemFields spec under "${ref.field}"`,
          ).toBeDefined()
        }
      }
    })
  }

  it("BLOCK_ELEMENTS.cta exposes primary and secondary CTA link groups", () => {
    const primary = (BLOCK_ELEMENTS.cta ?? []).find((s) => s.field === "primary")
    const secondary = (BLOCK_ELEMENTS.cta ?? []).find((s) => s.field === "secondary")
    expect(primary).toBeDefined()
    expect(primary!.kind).toBe("cta")
    expect(secondary).toBeDefined()
    expect(secondary!.kind).toBe("cta")
  })

  it("BLOCK_ELEMENTS.cta exposes the quote background image", () => {
    const backgroundImage = (BLOCK_ELEMENTS.cta ?? []).find((s) => s.field === "backgroundImage")
    expect(backgroundImage).toBeDefined()
    expect(backgroundImage!.kind).toBe("image")
  })

  it("prefers site manifest block fields over the fallback block schema", () => {
    const specs = getBlockElementSpecs("hero", {
      version: 1,
      inlineMarks: {},
      blockTypes: { paragraph: true },
      blocks: [
        {
          slug: "hero",
          fields: [
            { name: "title", label: "Compact title", kind: "text", role: "heading" },
            { name: "backgroundImage", label: "Background", kind: "image" },
          ],
        },
      ],
    })

    expect(specs.map((spec) => spec.field)).toEqual(["title", "backgroundImage"])
    expect(specs[0]).toMatchObject({ label: "Compact title", kind: "text", role: "heading" })
  })
})
