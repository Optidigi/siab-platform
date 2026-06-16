import { describe, it, expect } from "vitest"
import { rtRootSchema } from "@/lib/richText/rtNodeSchema"
import type { RtBlockRoot, RtInlineRoot } from "@/lib/richText/RtNode"

describe("rtNodeSchema", () => {
  it("accepts an empty block root", () => {
    const v: RtBlockRoot = { t: "root", variant: "block", children: [] }
    expect(() => rtRootSchema.parse(v)).not.toThrow()
  })

  it("accepts an empty inline root", () => {
    const v: RtInlineRoot = { t: "root", variant: "inline", children: [] }
    expect(() => rtRootSchema.parse(v)).not.toThrow()
  })

  it("rejects a paragraph inside an inline root", () => {
    const v = {
      t: "root", variant: "inline",
      children: [{ t: "paragraph", children: [] }]
    }
    expect(() => rtRootSchema.parse(v)).toThrow()
  })

  it("rejects an unknown node type", () => {
    const v = {
      t: "root", variant: "block",
      children: [{ t: "marquee", children: [] }]
    }
    expect(() => rtRootSchema.parse(v)).toThrow()
  })

  it("accepts a paragraph with block style and bold + italic marks", () => {
    const v = {
      t: "root", variant: "block",
      children: [
        { t: "paragraph", style: "lead", children: [
          { t: "text", v: "hi", marks: ["bold", "italic"] }
        ]}
      ]
    }
    expect(() => rtRootSchema.parse(v)).not.toThrow()
  })

  it("rejects a text node with an unknown mark", () => {
    const v = {
      t: "root", variant: "block",
      children: [
        { t: "paragraph", children: [
          { t: "text", v: "hi", marks: ["sparkle"] }
        ]}
      ]
    }
    expect(() => rtRootSchema.parse(v)).toThrow()
  })

  it("rejects heading level outside 2-4", () => {
    const v = {
      t: "root", variant: "block",
      children: [{ t: "heading", level: 1, children: [{ t: "text", v: "x" }] }]
    }
    expect(() => rtRootSchema.parse(v)).toThrow()
  })

  it("rejects a link with an invalid href scheme", () => {
    const v = {
      t: "root", variant: "block",
      children: [
        { t: "paragraph", children: [
          { t: "link", href: "javascript:alert(1)", children: [{ t: "text", v: "x" }] }
        ]}
      ]
    }
    expect(() => rtRootSchema.parse(v)).toThrow()
  })
})
