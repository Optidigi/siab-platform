import { describe, it, expect } from "vitest"
import { mapHtmlToRt } from "@/lib/richText/mapper"
import { eyebrowMatcher } from "@/lib/richText/themedMatchers/amicare/eyebrow"
import { matchersForManifest } from "@/lib/richText/themedMatchers"
import type { RtManifest } from "@/lib/richText/manifest"

const m: RtManifest = {
  version: 1,
  inlineMarks: { italic: true },
  blockTypes: { paragraph: true, heading: { levels: [2, 3] } },
  themedNodes: [{
    id: "eyebrow", label: "Eyebrow",
    fields: [{ name: "text", type: "text", required: true }],
  }],
}

describe("mapHtmlToRt — themed nodes (ami-care eyebrow)", () => {
  it("matches a rotated-accent span and emits eyebrow themed node", () => {
    const html = `<section><span class="inline-block -rotate-2 text-[20px] text-accent">Over mij</span><h2>title</h2><p>body</p></section>`
    const r = mapHtmlToRt(html, { variant: "block", manifest: m, themedMatchers: [eyebrowMatcher] } as any)
    expect((r as any).children[0]).toEqual({
      t: "themed", id: "eyebrow", props: { text: "Over mij" },
    })
    expect((r as any).children[1].t).toBe("heading")
    expect((r as any).children[2].t).toBe("paragraph")
  })
})

describe("matchersForManifest", () => {
  it("returns the eyebrow matcher when manifest declares 'eyebrow' themedNode", () => {
    const manifest: RtManifest = {
      version: 1, inlineMarks: {},
      blockTypes: { paragraph: true },
      themedNodes: [{ id: "eyebrow", label: "Eyebrow", fields: [{ name: "text", type: "text", required: true }] }],
    }
    expect(matchersForManifest(manifest).map((x) => x.id)).toEqual(["eyebrow"])
  })

  it("returns [] when manifest declares no themedNodes", () => {
    const manifest: RtManifest = {
      version: 1, inlineMarks: {},
      blockTypes: { paragraph: true },
    }
    expect(matchersForManifest(manifest)).toEqual([])
  })

  it("skips themedNode ids without a registered matcher", () => {
    const manifest: RtManifest = {
      version: 1, inlineMarks: {},
      blockTypes: { paragraph: true },
      themedNodes: [{ id: "unmatchedThemedNode", label: "X", fields: [] }],
    }
    expect(matchersForManifest(manifest)).toEqual([])
  })
})
