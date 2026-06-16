import { describe, expect, it } from "vitest"
import { CTA } from "@/blocks/CTA"
import { Hero } from "@/blocks/Hero"
import { SiteSettings } from "@/collections/SiteSettings"
import { isSafeHref, validateSafeHref } from "@/lib/security/safeHref"
import { pageToJson } from "@/lib/projection/pageToJson"
import { resolveNav } from "@/lib/projection/resolveNav"
import { settingsToJson } from "@/lib/projection/settingsToJson"

const groupField = (block: any, groupName: string, fieldName: string) => {
  const group = block.fields.find((field: any) => field.name === groupName)
  return group.fields.find((field: any) => field.name === fieldName)
}

const siteSettingsField = (name: string) =>
  (SiteSettings.fields as any[]).find((field: any) => field.name === name)

const navUrlField = () => {
  const navHeader = siteSettingsField("navHeader")
  return navHeader.fields.find((field: any) => field.name === "url")
}

const socialUrlField = () => {
  const contact = siteSettingsField("contact")
  const social = contact.fields.find((field: any) => field.name === "social")
  return social.fields.find((field: any) => field.name === "url")
}

describe("safe CMS href validation", () => {
  it("allows only explicit safe schemes, anchors, and single-slash relative paths", () => {
    for (const href of ["https://example.test/a", "http://example.test", "mailto:hi@example.test", "tel:+31205551234", "#contact", "/privacy", "/"]) {
      expect(isSafeHref(href), href).toBe(true)
      expect(validateSafeHref(href), href).toBe(true)
    }

    expect(isSafeHref("")).toBe(false)
    expect(validateSafeHref("")).toBe(true)

    for (const href of ["javascript:alert(1)", "data:text/html,<p>x</p>", "//evil.test/path", "ftp://example.test", "example.test/path", "bad\0url", "/\\evil"]) {
      expect(isSafeHref(href), href).toBe(false)
      expect(validateSafeHref(href), href).not.toBe(true)
    }
  })

  it("is wired into Hero and CTA href fields", () => {
    expect(groupField(Hero, "cta", "href").validate("javascript:alert(1)")).not.toBe(true)
    expect(groupField(Hero, "cta", "href").validate("/contact")).toBe(true)
    expect(groupField(CTA, "primary", "href").validate("data:text/html,<p>x</p>")).not.toBe(true)
    expect(groupField(CTA, "secondary", "href").validate("mailto:hi@example.test")).toBe(true)
  })

  it("is wired into custom navigation and social URL fields", () => {
    expect(navUrlField().validate("", { siblingData: { type: "custom" } })).toBe("URL is required for a custom link")
    expect(navUrlField().validate("//evil.test", { siblingData: { type: "custom" } })).not.toBe(true)
    expect(navUrlField().validate("/privacy", { siblingData: { type: "custom" } })).toBe(true)
    expect(navUrlField().validate("javascript:alert(1)", { siblingData: { type: "page" } })).toBe(true)

    expect(socialUrlField().validate("javascript:alert(1)")).not.toBe(true)
    expect(socialUrlField().validate("https://social.example.test/profile")).toBe(true)
  })

  it("defensively omits unsafe custom navigation hrefs from projection", () => {
    expect(resolveNav([{ type: "custom", label: "Bad", url: "javascript:alert(1)" }], [])).toEqual([])
    expect(resolveNav([{ type: "custom", label: "Good", url: " /privacy " }], [])).toEqual([
      { label: "Good", href: "/privacy", external: false },
    ])
  })

  it("defensively strips unsafe Hero and CTA hrefs from page projection", () => {
    const json = pageToJson({
      title: "Home",
      slug: "home",
      updatedAt: "2026-06-03T00:00:00.000Z",
      blocks: [
        { blockType: "hero", cta: { label: "Bad", href: "javascript:alert(1)" } },
        { blockType: "cta", primary: { label: "Bad", href: "data:text/html,<p>x</p>" }, secondary: { label: "Good", href: " /contact " } },
      ],
    })

    expect(json.blocks[0].cta).toEqual({ label: "Bad" })
    expect(json.blocks[1].primary).toEqual({ label: "Bad" })
    expect(json.blocks[1].secondary).toEqual({ label: "Good", href: "/contact" })
  })

  it("defensively omits unsafe social URLs from settings projection", () => {
    const json = settingsToJson({
      siteName: "Site",
      siteUrl: "https://site.example",
      contact: {
        social: [
          { platform: "bad", url: "javascript:alert(1)" },
          { platform: "good", url: " https://social.example/profile " },
        ],
      },
    }, [], {}, {
      settingsContract: {
        general: { description: true, language: false, contactEmail: false },
        identity: { branding: { logo: true, favicon: true }, footer: { tagline: false, copyright: false } },
        details: {
          contact: { phone: false, address: false, social: true },
          business: {
            legalName: false,
            kvkNumber: false,
            establishmentNumber: false,
            streetAddress: false,
            city: false,
            region: false,
            postalCode: false,
            country: false,
          },
          serviceArea: false,
          hours: false,
        },
        operations: { maintenance: true },
      },
    })

    expect(json.contact?.social).toEqual([{ platform: "good", url: "https://social.example/profile" }])
  })
})
