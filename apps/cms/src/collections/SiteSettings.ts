import type { CollectionConfig } from "payload"
import { canRead, canUpdateSettings } from "@/access/roleHelpers"
import { projectSettingsToDisk } from "@/hooks/projectToDisk"
import { validateTenantExists } from "@/hooks/validateTenantExists"
import { validateSafeHref } from "@/lib/security/safeHref"

// HH:MM 24h matcher. Accepts 00:00–23:59.
const TIME_HHMM = /^([01]\d|2[0-3]):[0-5]\d$/

const validateHHMM = (val: unknown, { siblingData }: any) => {
  // If the row is marked closed, open/close are ignored — empty is fine.
  if (siblingData?.closed) return true
  if (val == null || val === "") return "Required when the day is not closed"
  if (typeof val !== "string" || !TIME_HHMM.test(val)) return "Use HH:MM 24h format (e.g. 09:00)"
  return true
}

// FN-2026-0004 — primaryColor accepted any free-text string. Validate as a
// 3- or 6-digit hex color (with leading '#'). Empty is allowed (field is
// optional — the renderer falls back to a default when unset).
const HEX_COLOR_REGEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i
const validatePrimaryColor = (val: unknown) => {
  if (val == null || val === "") return true
  if (typeof val !== "string" || !HEX_COLOR_REGEX.test(val)) {
    return "Hex color (e.g. #2563eb or #25b)"
  }
  return true
}

const nonEmpty = (val: unknown) => typeof val === "string" && val.trim() !== ""

// OBS-20 — a navigation entry is a discriminated union over `type`:
//   page    → links to a CMS page (label defaults to the page title)
//   section → links to a `#anchor` (a block's anchor id) within `page`,
//             or the current page when `page` is unset (onepager case)
//   custom  → an arbitrary URL
// navHeader and navFooter both use this exact shape. Defined as a factory so
// each array field gets its own field-config objects (Payload mutates field
// configs during init — a shared reference would cross-wire the two arrays).
const navEntryFields = () => [
  {
    name: "type",
    type: "select" as const,
    required: true,
    defaultValue: "page",
    options: [
      { label: "Page link", value: "page" },
      { label: "Section link", value: "section" },
      { label: "Custom link", value: "custom" },
    ],
    admin: {
      description:
        "Page = link to a CMS page · Section = #anchor within a page · Custom = any URL.",
    },
  },
  {
    name: "page",
    type: "relationship" as const,
    relationTo: "pages" as const,
    admin: {
      condition: (_: unknown, sib: any) => sib?.type === "page" || sib?.type === "section",
      description: "Target page. For a section link, the page the section lives on (leave blank for the current page).",
    },
    validate: (val: unknown, { siblingData }: any) => {
      if (siblingData?.type !== "page") return true
      if (val == null) return "Select a target page for a page link"
      return true
    },
  },
  {
    name: "anchor",
    type: "text" as const,
    admin: {
      condition: (_: unknown, sib: any) => sib?.type === "section",
      description: "Section id without the leading '#' (e.g. 'services').",
    },
    validate: (val: unknown, { siblingData }: any) => {
      if (siblingData?.type !== "section") return true
      return nonEmpty(val) ? true : "Anchor is required for a section link"
    },
  },
  {
    name: "url",
    type: "text" as const,
    admin: {
      condition: (_: unknown, sib: any) => sib?.type === "custom",
      description: "Full URL (https://…) or a site-relative path.",
    },
    validate: (val: unknown, { siblingData }: any) => {
      if (siblingData?.type !== "custom") return true
      if (!nonEmpty(val)) return "URL is required for a custom link"
      return validateSafeHref(val)
    },
  },
  {
    name: "label",
    type: "text" as const,
    admin: {
      description: "Display text. For a page link, leave blank to use the page's title.",
    },
    validate: (val: unknown, { siblingData }: any) => {
      // Page links may omit the label — it falls back to the page title at
      // projection time. Section/custom links carry no inherent title.
      if (siblingData?.type === "page") return true
      return nonEmpty(val) ? true : "Label is required"
    },
  },
  {
    name: "external",
    type: "checkbox" as const,
    defaultValue: false,
    admin: {
      condition: (_: unknown, sib: any) => sib?.type === "custom",
      description: "Open in a new tab (external site).",
    },
  },
]

export const SiteSettings: CollectionConfig = {
  slug: "site-settings",
  access: {
    read: canRead,
    create: canUpdateSettings,
    update: canUpdateSettings,
    delete: ({ req }) => req.user?.role === "super-admin"
  },
  admin: { useAsTitle: "siteName", description: "One record per tenant." },
  fields: [
    { name: "siteName", type: "text", required: true },
    { name: "siteUrl", type: "text", required: true,
      admin: { description: "Public URL of the SSR site (e.g. https://clientasite.nl)" } },
    { name: "description", type: "textarea",
      admin: { description: "One-paragraph site description (used in <meta name=\"description\"> and footers)." } },
    { name: "language", type: "text", defaultValue: "en",
      admin: { description: "ISO 639-1 lang code, used in <html lang>. Default 'en'." } },
    { name: "aliases", type: "array",
      admin: { description: "Alternative domains that should serve the same site (e.g. www.foo.com aliased to foo.com)." },
      fields: [
        { name: "host", type: "text", required: true }
      ]},
    { name: "contactEmail", type: "email" },
    { name: "branding", type: "group", fields: [
      { name: "logo", type: "upload", relationTo: "media" },
      { name: "favicon", type: "upload", relationTo: "media" },
      { name: "primaryColor", type: "text", validate: validatePrimaryColor,
        admin: { description: "Hex (e.g. #2563eb)" } }
    ]},
    { name: "chrome", type: "group",
      admin: { description: "Non-navigation header/footer content edited from the page editor chrome inspector." },
      fields: [
        { name: "header", type: "group", fields: [
          { name: "logo", type: "upload", relationTo: "media",
            admin: { description: "Optional header-specific logo. Falls back to Branding logo." } }
        ]},
        { name: "footer", type: "group", fields: [
          { name: "logo", type: "upload", relationTo: "media",
            admin: { description: "Optional footer-specific logo. Falls back to Branding logo." } },
          { name: "tagline", type: "textarea" },
          { name: "copyright", type: "text" },
          { name: "columns", type: "json",
            admin: { description: "Manifest-driven footer column composition edited from the page editor." } }
        ]}
      ]},
    { name: "maintenance", type: "group", fields: [
      { name: "enabled", type: "checkbox", defaultValue: false },
      { name: "message", type: "textarea" }
    ]},
    { name: "contact", type: "group", fields: [
      { name: "phone", type: "text" },
      { name: "address", type: "textarea" },
      { name: "social", type: "array", fields: [
        { name: "platform", type: "text", required: true },
        { name: "url", type: "text", required: true, validate: validateSafeHref }
      ]}
    ]},
    { name: "nap", type: "group",
      admin: { description: "Name / Address / Phone — canonical legal-entity contact info used for SEO and footer." },
      fields: [
        { name: "legalName", type: "text",
          admin: { description: "Legal entity name (may differ from siteName/brand)." } },
        { name: "kvkNumber", type: "text",
          admin: { description: "Dutch Chamber of Commerce number, shown in compliant site footers when present." } },
        { name: "establishmentNumber", type: "text",
          admin: { description: "Dutch establishment number, shown in compliant site footers when present." } },
        { name: "streetAddress", type: "text" },
        { name: "city", type: "text" },
        { name: "region", type: "text", admin: { description: "Province / state." } },
        { name: "postalCode", type: "text" },
        { name: "country", type: "text", defaultValue: "NL",
          admin: { description: "ISO 3166-1 alpha-2 (default 'NL')." } }
      ]},
    { name: "hours", type: "array",
      admin: { description: "Opening hours per weekday. Use 'closed' for days the business is closed." },
      fields: [
        { name: "day", type: "select", required: true, options: [
          { label: "Monday", value: "monday" },
          { label: "Tuesday", value: "tuesday" },
          { label: "Wednesday", value: "wednesday" },
          { label: "Thursday", value: "thursday" },
          { label: "Friday", value: "friday" },
          { label: "Saturday", value: "saturday" },
          { label: "Sunday", value: "sunday" }
        ]},
        { name: "open", type: "text", validate: validateHHMM,
          admin: { description: "HH:MM 24h. Required unless the day is closed." } },
        { name: "close", type: "text", validate: validateHHMM,
          admin: { description: "HH:MM 24h. Required unless the day is closed." } },
        { name: "closed", type: "checkbox", defaultValue: false,
          admin: { description: "When checked, open/close are ignored." } }
      ]},
    { name: "serviceArea", type: "array",
      admin: { description: "Geographic regions (cities, postcodes, etc.) the business serves." },
      fields: [
        { name: "name", type: "text", required: true }
      ]},
    { name: "navHeader", type: "array", fields: navEntryFields(),
      admin: { description: "Header navigation. Entries render in order; drag to reorder." } },
    { name: "navFooter", type: "array", fields: navEntryFields(),
      admin: { description: "Footer navigation. Entries render in order; drag to reorder." } }
  ],
  hooks: {
    beforeValidate: [validateTenantExists],
    afterChange: [projectSettingsToDisk]
  }
}
