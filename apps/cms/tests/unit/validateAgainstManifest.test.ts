import { describe, it, expect } from "vitest"
import { validateAgainstManifest } from "@/lib/richText/validateAgainstManifest"
import type { RtManifest } from "@/lib/richText/manifest"
import type { RtRoot } from "@/lib/richText/RtNode"

const manifest: RtManifest = {
  version: 1,
  inlineMarks: { bold: true, italic: true },
  blockTypes: { paragraph: true, heading: { levels: [2, 3] } },
  typeStyles: [{ id: "display", label: "Display", appliesTo: "inline" as const }],
  colorTokens: [{ id: "accent", label: "Accent", cssVar: "--color-accent" }],
  themedNodes: [{
    id: "eyebrow", label: "Eyebrow",
    fields: [{ name: "text", type: "text", required: true }],
  }],
}

describe("validateAgainstManifest", () => {
  it("accepts text using a declared style + color", () => {
    const root: RtRoot = { t: "root", variant: "block", children: [
      { t: "paragraph", children: [{ t: "text", v: "hi", style: "display", color: "accent" }] }
    ]}
    const r = validateAgainstManifest(root, manifest)
    expect(r.ok).toBe(true)
  })

  it("rejects text using an undeclared style", () => {
    const root: RtRoot = { t: "root", variant: "block", children: [
      { t: "paragraph", children: [{ t: "text", v: "hi", style: "neon" }] }
    ]}
    const r = validateAgainstManifest(root, manifest)
    expect(r.ok).toBe(false)
  })

  it("rejects a themed node whose id is not declared", () => {
    const root: RtRoot = { t: "root", variant: "block", children: [
      { t: "themed", id: "callout", props: {} }
    ]}
    const r = validateAgainstManifest(root, manifest)
    expect(r.ok).toBe(false)
  })

  it("rejects a themed node missing a required field", () => {
    const root: RtRoot = { t: "root", variant: "block", children: [
      { t: "themed", id: "eyebrow", props: {} }
    ]}
    const r = validateAgainstManifest(root, manifest)
    expect(r.ok).toBe(false)
  })

  it("rejects a mark not enabled in the manifest", () => {
    const root: RtRoot = { t: "root", variant: "block", children: [
      { t: "paragraph", children: [{ t: "text", v: "hi", marks: ["code"] }] }
    ]}
    const r = validateAgainstManifest(root, manifest)
    expect(r.ok).toBe(false)
  })

  it("rejects a heading level not enabled in the manifest", () => {
    const root: RtRoot = { t: "root", variant: "block", children: [
      { t: "heading", level: 4, children: [{ t: "text", v: "x" }] }
    ]}
    const r = validateAgainstManifest(root, manifest)
    expect(r.ok).toBe(false)
  })

  it("rejects an unsafe URL value in a themed-node url field", () => {
    const manifestWithUrl: RtManifest = {
      version: 1,
      inlineMarks: {},
      blockTypes: { paragraph: true },
      themedNodes: [{
        id: "callout", label: "Callout",
        fields: [
          { name: "href", type: "url" },
        ],
      }],
    }
    const root: RtRoot = { t: "root", variant: "block", children: [
      { t: "themed", id: "callout", props: { href: "javascript:alert(1)" } }
    ]}
    const r = validateAgainstManifest(root, manifestWithUrl)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors.join(" ")).toMatch(/unsafe URL/i)
  })

  it("accepts a safe URL value in a themed-node url field", () => {
    const manifestWithUrl: RtManifest = {
      version: 1,
      inlineMarks: {},
      blockTypes: { paragraph: true },
      themedNodes: [{
        id: "callout", label: "Callout",
        fields: [
          { name: "href", type: "url" },
        ],
      }],
    }
    const root: RtRoot = { t: "root", variant: "block", children: [
      { t: "themed", id: "callout", props: { href: "https://example.com" } }
    ]}
    const r = validateAgainstManifest(root, manifestWithUrl)
    expect(r.ok).toBe(true)
  })
})
