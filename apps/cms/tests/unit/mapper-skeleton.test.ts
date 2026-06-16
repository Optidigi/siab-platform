import { describe, it, expect } from "vitest"
import { mapHtmlToRt } from "@/lib/richText/mapper"

describe("mapHtmlToRt — skeleton", () => {
  it("returns empty block root for empty string", () => {
    expect(mapHtmlToRt("", { variant: "block", manifest: { version: 1, inlineMarks: {}, blockTypes: { paragraph: true } } }))
      .toEqual({ t: "root", variant: "block", children: [] })
  })

  it("returns empty inline root for empty string", () => {
    expect(mapHtmlToRt("", { variant: "inline", manifest: { version: 1, inlineMarks: {}, blockTypes: { paragraph: true } } }))
      .toEqual({ t: "root", variant: "inline", children: [] })
  })
})
