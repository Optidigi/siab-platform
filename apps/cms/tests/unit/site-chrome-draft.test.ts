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
          header: {
            variant: "amicareZen",
            logo: { id: 10, url: "/logo.png" },
            cta: { label: "Contact", href: "/contact" },
          },
          footer: {
            variant: "amicareZen",
            logo: 11,
            tagline: "Footer copy",
            copyright: "2026",
            legalLinks: [{ label: "Privacy", href: "/privacy" }],
            columns: [{ items: [{ type: "text", label: "About", text: "Hello" }] }],
          },
          banner: { variant: "default", visible: true, message: "Update" },
        },
      },
      footerContract,
    )

    expect(draft.header.variant).toBe("amicareZen")
    expect(draft.header.logo).toEqual({ id: 10, url: "/logo.png" })
    expect(draft.header.cta).toEqual({ label: "Contact", href: "/contact" })
    expect(draft.footer.variant).toBe("amicareZen")
    expect(draft.footer.logo).toBe(11)
    expect(draft.footer.tagline).toBe("Footer copy")
    expect(draft.footer.legalLinks).toEqual([{ label: "Privacy", href: "/privacy" }])
    expect(draft.footer.columns[0]?.items[0]?.type).toBe("text")
    expect(draft.banner).toEqual({ variant: "default", visible: true, message: "Update" })
  })

  it("normalizes media relationships for comparison and PATCH payloads", () => {
    const draft: SiteChromeDraft = {
      header: { variant: "hyperUiSimple", logo: { id: 10, url: "/logo.png" }, cta: { label: "Start", href: "/start" } },
      footer: {
        variant: "hyperUiSimple",
        logo: { id: "11" },
        tagline: "",
        copyright: null,
        legalLinks: [{ label: "Privacy", href: "/privacy" }],
        columns: [{ items: [{ type: "brand", label: "Brand" }] }],
      },
      banner: { variant: "default", visible: true, message: "Update" },
    }

    expect(chromeComparable(draft, footerContract).header.logo).toBe(10)
    expect(chromeComparable(draft, footerContract).footer.logo).toBe("11")
    expect(chromePatchFromDraft(draft, footerContract)).toMatchObject({
      header: { variant: "hyperUiSimple", logo: 10, cta: { label: "Start", href: "/start" } },
      footer: { variant: "hyperUiSimple", logo: "11", tagline: "", copyright: null, legalLinks: [{ label: "Privacy", href: "/privacy" }] },
      banner: { variant: "default", visible: true, message: "Update" },
    })
  })

  it("merges draft chrome without dropping unrelated settings", () => {
    const settings = {
      id: 7,
      siteName: "Site",
      chrome: {
        header: { variant: "compact", behavior: "sticky" },
        footer: { copyright: "old", legalLinks: [{ label: "Old", href: "/old" }] },
      },
    }
    const draft: SiteChromeDraft = {
      header: { variant: "default", logo: 3, behavior: "static", cta: { label: "Go", href: "/go" } },
      footer: {
        variant: "default",
        logo: null,
        tagline: "New",
        copyright: "2026",
        legalLinks: [{ label: "Privacy", href: "/privacy" }],
        columns: [],
      },
      banner: { variant: "hyperUiSimple", visible: false },
    }

    expect(mergeChromeSettings(settings, draft)).toEqual({
      id: 7,
      siteName: "Site",
      chrome: {
        header: { variant: "default", behavior: "static", logo: 3, cta: { label: "Go", href: "/go" } },
        footer: {
          variant: "default",
          copyright: "2026",
          logo: null,
          tagline: "New",
          legalLinks: [{ label: "Privacy", href: "/privacy" }],
          columns: [],
        },
        banner: { variant: "hyperUiSimple", visible: false },
      },
    })
  })
})
