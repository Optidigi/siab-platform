import { describe, expect, it } from "vitest"
import { validateAgainstManifest } from "@/lib/richText/validateAgainstManifest"
import type { RtManifest } from "@/lib/richText/manifest"
import type { RtRoot } from "@/lib/richText/RtNode"

const manifest: RtManifest = {
  version: 1,
  inlineMarks: { bold: true, italic: true },
  blockTypes: { paragraph: true, heading: { levels: [2, 3] } },
  colorTokens: [{ id: "accent", label: "Accent", cssVar: "--color-accent" }],
  fontFamilies: [{ id: "heading", label: "Heading font", cssVar: "--font-heading" }],
  typeStyles: [
    { id: "inline-only", label: "Inline only", appliesTo: "inline" },
    { id: "heading-only", label: "Heading only", appliesTo: "heading" },
    { id: "para-only", label: "Paragraph only", appliesTo: "paragraph" },
  ],
}

describe("validateAgainstManifest — typeStyle appliesTo", () => {
  it("accepts inline-only style on a text node", () => {
    const root: RtRoot = { t: "root", variant: "block", children: [
      { t: "paragraph", children: [{ t: "text", v: "hi", style: "inline-only" }] },
    ] }
    expect(validateAgainstManifest(root, manifest)).toEqual({ ok: true })
  })

  it("rejects heading-only style on a text node", () => {
    const root: RtRoot = { t: "root", variant: "block", children: [
      { t: "paragraph", children: [{ t: "text", v: "hi", style: "heading-only" }] },
    ] }
    const r = validateAgainstManifest(root, manifest)
    expect(r.ok).toBe(false)
    expect(r.ok === false && r.errors[0]).toMatch(/appliesTo.*heading/i)
  })

  it("accepts heading-only style on a heading element", () => {
    // NOTE: `style` on RtHeading is added in Task 3 — this test will typecheck only after that commit.
    const root: RtRoot = { t: "root", variant: "block", children: [
      { t: "heading", level: 2, style: "heading-only", children: [{ t: "text", v: "hi" }] },
    ] }
    expect(validateAgainstManifest(root, manifest)).toEqual({ ok: true })
  })

  it("rejects inline-only style on a heading element", () => {
    const root: RtRoot = { t: "root", variant: "block", children: [
      { t: "heading", level: 2, style: "inline-only", children: [{ t: "text", v: "hi" }] },
    ] }
    const r = validateAgainstManifest(root, manifest)
    expect(r.ok).toBe(false)
    expect(r.ok === false && r.errors[0]).toMatch(/appliesTo.*inline/i)
  })

  it("rejects paragraph-only style on a text node", () => {
    const root: RtRoot = { t: "root", variant: "block", children: [
      { t: "paragraph", children: [{ t: "text", v: "hi", style: "para-only" }] },
    ] }
    const r = validateAgainstManifest(root, manifest)
    expect(r.ok).toBe(false)
    expect(r.ok === false && r.errors[0]).toMatch(/appliesTo.*paragraph/i)
  })

  it("accepts paragraph-only style on a paragraph element", () => {
    const root: RtRoot = { t: "root", variant: "block", children: [
      { t: "paragraph", style: "para-only", children: [{ t: "text", v: "hi" }] },
    ] }
    expect(validateAgainstManifest(root, manifest)).toEqual({ ok: true })
  })

  it("accepts text using a declared font family", () => {
    const root: RtRoot = { t: "root", variant: "block", children: [
      { t: "paragraph", children: [{ t: "text", v: "hi", font: "heading" }] },
    ] }
    expect(validateAgainstManifest(root, manifest)).toEqual({ ok: true })
  })

  it("rejects text using an undeclared font family", () => {
    const root: RtRoot = { t: "root", variant: "block", children: [
      { t: "paragraph", children: [{ t: "text", v: "hi", font: "script" }] },
    ] }
    const r = validateAgainstManifest(root, manifest)
    expect(r.ok).toBe(false)
    expect(r.ok === false && r.errors[0]).toMatch(/fontFamily "script" not in manifest/)
  })
})
