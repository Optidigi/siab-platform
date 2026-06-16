import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { mapHtmlToRt } from "@/lib/richText/mapper"
import { eyebrowMatcher } from "@/lib/richText/themedMatchers/amicare/eyebrow"
import type { RtManifest } from "@/lib/richText/manifest"

const amicareManifest: RtManifest = {
  version: 1,
  inlineMarks: { bold: true, italic: true },
  colorTokens: [{ id: "accent", label: "Accent", cssVar: "--color-accent" }],
  blockTypes: {
    paragraph: true,
    heading: { levels: [2, 3] },
    bulletList: true,
    orderedList: true,
    blockquote: true,
    divider: true,
  },
  themedNodes: [{
    id: "eyebrow", label: "Eyebrow",
    fields: [{ name: "text", type: "text", required: true }],
  }],
}

describe("mapper — ami-care live snapshot", () => {
  it("converts the 2026-05-13 prod RichText.body verbatim", () => {
    const html = readFileSync(resolve(__dirname, "../fixtures/richtext/ami-care-live-snapshot.html"), "utf-8")
    const expected = JSON.parse(readFileSync(resolve(__dirname, "../fixtures/richtext/ami-care-live-snapshot.expected.json"), "utf-8"))
    const got = mapHtmlToRt(html, {
      variant: "block",
      manifest: amicareManifest,
      themedMatchers: [eyebrowMatcher],
    })
    expect(got).toEqual(expected)
  })
})
