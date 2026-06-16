import { describe, it, expect } from "vitest"
import { rtToLexicalJson } from "@/lib/richText/lexical/rtToLexical"
import { lexicalJsonToRt } from "@/lib/richText/lexical/lexicalToRt"
import type { RtBlockRoot, RtInlineRoot } from "@/lib/richText/RtNode"

describe("RtRoot ↔ Lexical roundtrip identity", () => {
  const cases: Array<RtBlockRoot | RtInlineRoot> = [
    { t: "root", variant: "block", children: [] },
    { t: "root", variant: "inline", children: [] },
    { t: "root", variant: "block", children: [
      { t: "paragraph", style: "lead", children: [{ t: "text", v: "hi", marks: ["bold"] }] },
    ]},
    { t: "root", variant: "block", children: [
      { t: "heading", level: 2, children: [{ t: "text", v: "Title" }] },
      { t: "paragraph", children: [
        { t: "text", v: "Some " },
        { t: "text", v: "bold", marks: ["bold"] },
        { t: "text", v: " and " },
        { t: "link", href: "/x", children: [{ t: "text", v: "link" }] },
      ]},
      { t: "list", ordered: true, items: [
        { t: "listItem", children: [{ t: "paragraph", children: [{ t: "text", v: "one" }] }] },
        { t: "listItem", children: [{ t: "paragraph", children: [{ t: "text", v: "two" }] }] },
      ]},
      { t: "blockquote", children: [{ t: "paragraph", children: [{ t: "text", v: "q" }] }] },
      { t: "divider" },
      { t: "themed", id: "eyebrow", props: { text: "Over mij" } },
    ]},
    { t: "root", variant: "inline", children: [
      { t: "text", v: "hello " },
      { t: "text", v: "world", marks: ["italic"], font: "heading" },
    ]},
    { t: "root", variant: "block", children: [
      { t: "paragraph", children: [
        { t: "text", v: "plain " },
        { t: "text", v: "accent", color: "accent" },
      ] },
    ]},
  ]

  for (const [i, c] of cases.entries()) {
    it(`case ${i} round-trips`, () => {
      const back = lexicalJsonToRt(rtToLexicalJson(c), c.variant)
      expect(back).toEqual(c)
    })
  }
})
