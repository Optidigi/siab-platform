import { describe, expect, it, vi } from "vitest"
import { BLOCKS, resolveAllowedBlocks } from "@/blocks/registry"

describe("resolveAllowedBlocks", () => {
  it("returns the full registry when declared is undefined", () => {
    const result = resolveAllowedBlocks(BLOCKS, undefined)
    expect(result).toHaveLength(BLOCKS.length)
    expect(result.map((b) => b.slug)).toEqual(BLOCKS.map((b) => b.slug))
  })

  it("returns the full registry when declared is empty array", () => {
    const result = resolveAllowedBlocks(BLOCKS, [])
    expect(result).toHaveLength(BLOCKS.length)
  })

  it("filters + orders by declared slugs", () => {
    const result = resolveAllowedBlocks(BLOCKS, [
      { slug: "richText" },
      { slug: "hero" },
    ])
    expect(result.map((b) => b.slug)).toEqual(["richText", "hero"])
  })

  it("skips unknown slugs with a warning, keeps the known ones", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const result = resolveAllowedBlocks(BLOCKS, [
      { slug: "hero" },
      { slug: "not-a-real-block" },
      { slug: "cta" },
    ])
    expect(result.map((b) => b.slug)).toEqual(["hero", "cta"])
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("not-a-real-block"))
    warn.mockRestore()
  })
})
