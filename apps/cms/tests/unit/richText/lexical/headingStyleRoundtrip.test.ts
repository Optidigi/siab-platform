import { describe, expect, it } from "vitest"
import { rtToLexicalJson } from "@/lib/richText/lexical/rtToLexical"
import { lexicalJsonToRt } from "@/lib/richText/lexical/lexicalToRt"
import type { RtRoot } from "@/lib/richText/RtNode"

describe("heading style roundtrip", () => {
  it("preserves heading style through rt → lexical → rt", () => {
    const original: RtRoot = {
      t: "root", variant: "block",
      children: [
        { t: "heading", level: 2, style: "hero-eyebrow", children: [{ t: "text", v: "Hi" }] },
      ],
    }
    const lexical = rtToLexicalJson(original)
    const roundtripped = lexicalJsonToRt(lexical as any, "block")
    expect(roundtripped).toEqual(original)
  })

  it("preserves headings WITHOUT style (no spurious field)", () => {
    const original: RtRoot = {
      t: "root", variant: "block",
      children: [
        { t: "heading", level: 3, children: [{ t: "text", v: "Plain" }] },
      ],
    }
    const lexical = rtToLexicalJson(original)
    const roundtripped = lexicalJsonToRt(lexical as any, "block")
    expect(roundtripped).toEqual(original)
    expect((roundtripped.children[0] as any).style).toBeUndefined()
  })

  it("emits 'styled-heading' type when style is present, 'heading' when absent", () => {
    const styled = rtToLexicalJson({ t: "root", variant: "block", children: [
      { t: "heading", level: 2, style: "foo", children: [{ t: "text", v: "x" }] },
    ] })
    expect((styled as any).root.children[0].type).toBe("styled-heading")

    const plain = rtToLexicalJson({ t: "root", variant: "block", children: [
      { t: "heading", level: 2, children: [{ t: "text", v: "x" }] },
    ] })
    expect((plain as any).root.children[0].type).toBe("heading")
  })
})
