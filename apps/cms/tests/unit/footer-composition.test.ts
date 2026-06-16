import { describe, expect, it } from "vitest"
import {
  defaultFooterColumns,
  normalizeFooterColumns,
  resolveFooterContract,
} from "@/lib/footerComposition"

const manifest: any = {
  version: 1,
  inlineMarks: {},
  blockTypes: { paragraph: true },
  footer: {
    columnCounts: [1, 2, 3],
    defaultColumnCount: 3,
    items: [
      { type: "brand", label: "Brand" },
      { type: "business", label: "Business" },
      { type: "contact", label: "Contact" },
      { type: "text", label: "Text" },
    ],
  },
}

describe("footer composition", () => {
  it("resolves a manifest footer contract", () => {
    expect(resolveFooterContract(manifest)).toEqual({
      columnCounts: [1, 2, 3],
      defaultColumnCount: 3,
      items: [
        { type: "brand", label: "Brand" },
        { type: "business", label: "Business" },
        { type: "contact", label: "Contact" },
        { type: "text", label: "Text" },
      ],
    })
  })

  it("builds Amicare-style default columns from the contract", () => {
    const columns = defaultFooterColumns({ chrome: { footer: { tagline: "Care first" } } }, resolveFooterContract(manifest))

    expect(columns).toHaveLength(3)
    expect(columns[0]?.items[0]).toMatchObject({ type: "brand", text: "Care first" })
    expect(columns[1]?.items[0]).toMatchObject({ type: "business" })
    expect(columns[2]?.items[0]).toMatchObject({ type: "contact" })
  })

  it("drops unsupported item types when a contract is supplied", () => {
    const columns = normalizeFooterColumns([
      { items: [{ type: "brand" }, { type: "links", links: [{ label: "X", href: "/x" }] }] },
    ], resolveFooterContract(manifest))

    expect(columns).toEqual([{ id: null, items: [{ id: null, type: "brand", label: null, text: null, links: [] }] }])
  })

  it("normalizes each footer column to one content item", () => {
    const columns = normalizeFooterColumns([
      { items: [{ type: "brand" }, { type: "business" }, { type: "contact" }] },
    ], resolveFooterContract(manifest))

    expect(columns[0]?.items).toHaveLength(1)
    expect(columns[0]?.items[0]?.type).toBe("brand")
  })

  it("materializes visible text placeholders as saved text-column content", () => {
    const columns = normalizeFooterColumns([
      { items: [{ type: "text", label: "", text: "" }] },
    ], resolveFooterContract(manifest))

    expect(columns).toEqual([{ id: null, items: [{ id: null, type: "text", label: "Info", text: "Text", links: [] }] }])
  })
})
