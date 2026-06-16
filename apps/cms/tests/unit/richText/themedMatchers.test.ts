import { describe, expect, it } from "vitest"
import { matchersForManifest, eyebrowMatcher } from "@/lib/richText/themedMatchers"
import type { RtManifest } from "@/lib/richText/manifest"

describe("matchersForManifest (post-reorganisation)", () => {
  const baseManifest: RtManifest = {
    version: 1,
    inlineMarks: { bold: true, italic: true },
    blockTypes: { paragraph: true, heading: { levels: [2, 3] } },
  }

  it("returns the eyebrow matcher when manifest declares themedNodes[eyebrow]", () => {
    const result = matchersForManifest({
      ...baseManifest,
      themedNodes: [
        { id: "eyebrow", label: "Eyebrow", fields: [{ name: "text", type: "text" }] },
      ],
    })
    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe("eyebrow")
    expect(result[0]).toBe(eyebrowMatcher)
  })

  it("returns empty when manifest declares no themedNodes", () => {
    expect(matchersForManifest(baseManifest)).toHaveLength(0)
  })

  it("ignores themedNode ids that have no registered matcher", () => {
    const result = matchersForManifest({
      ...baseManifest,
      themedNodes: [
        { id: "pullquote", label: "Pull Quote", fields: [{ name: "text", type: "text" }] },
        { id: "eyebrow", label: "Eyebrow", fields: [{ name: "text", type: "text" }] },
      ],
    })
    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe("eyebrow")
  })
})
