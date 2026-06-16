import { describe, expect, it } from "vitest"
import {
  chromeComparable,
  chromeDraftFromSettings,
  chromePatchFromDraft,
  mergeChromeSettings,
  type SiteChromeDraft,
} from "@/lib/siteChromeDraft"
import type { FooterCompositionContract } from "@/lib/footerComposition"

const footerContract: FooterCompositionContract = {
  columnCounts: [2, 3],
  defaultColumnCount: 2,
  items: [
    { type: "brand", label: "Brand" },
    { type: "links", label: "Links" },
    { type: "text", label: "Text" },
  ],
}

describe("site chrome draft helpers", () => {
  it("builds a draft from existing settings chrome", () => {
    const draft = chromeDraftFromSettings(
      {
        chrome: {
          header: { logo: { id: 10, url: "/logo.png" } },
          footer: {
            logo: 11,
            tagline: "Footer copy",
            copyright: "2026",
            columns: [{ items: [{ type: "text", label: "About", text: "Hello" }] }],
          },
        },
      },
      footerContract,
    )

    expect(draft.header.logo).toEqual({ id: 10, url: "/logo.png" })
    expect(draft.footer.logo).toBe(11)
    expect(draft.footer.tagline).toBe("Footer copy")
    expect(draft.footer.columns[0]?.items[0]?.type).toBe("text")
  })

  it("normalizes media relationships for comparison and PATCH payloads", () => {
    const draft: SiteChromeDraft = {
      header: { logo: { id: 10, url: "/logo.png" } },
      footer: {
        logo: { id: "11" },
        tagline: "",
        copyright: null,
        columns: [{ items: [{ type: "brand", label: "Brand" }] }],
      },
    }

    expect(chromeComparable(draft, footerContract).header.logo).toBe(10)
    expect(chromeComparable(draft, footerContract).footer.logo).toBe("11")
    expect(chromePatchFromDraft(draft, footerContract)).toMatchObject({
      header: { logo: 10 },
      footer: { logo: "11", tagline: "", copyright: null },
    })
  })

  it("merges draft chrome without dropping unrelated settings", () => {
    const settings = {
      id: 7,
      siteName: "Site",
      chrome: { header: { variant: "compact" }, footer: { copyright: "old" } },
    }
    const draft: SiteChromeDraft = {
      header: { logo: 3 },
      footer: { logo: null, tagline: "New", copyright: "2026", columns: [] },
    }

    expect(mergeChromeSettings(settings, draft)).toEqual({
      id: 7,
      siteName: "Site",
      chrome: {
        header: { variant: "compact", logo: 3 },
        footer: { copyright: "2026", logo: null, tagline: "New", columns: [] },
      },
    })
  })
})
