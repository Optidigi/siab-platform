import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { manifestSchema } from "@/lib/richText/manifest"
import {
  DEFAULT_CLIENT_SETTINGS_CONTRACT,
  resolveSettingsContract,
} from "@/lib/settingsContract"

const repo = (...parts: string[]) => resolve(__dirname, "../..", ...parts)
const source = (path: string) => readFileSync(repo(path), "utf8")

describe("settings contract", () => {
  it("uses a slim client-facing settings surface when no contract is declared", () => {
    expect(resolveSettingsContract(undefined)).toEqual(DEFAULT_CLIENT_SETTINGS_CONTRACT)
    expect(DEFAULT_CLIENT_SETTINGS_CONTRACT.general.language).toBe(false)
    expect(DEFAULT_CLIENT_SETTINGS_CONTRACT.general.contactEmail).toBe(false)
    expect(DEFAULT_CLIENT_SETTINGS_CONTRACT.identity.footer).toEqual({
      tagline: false,
      copyright: false,
    })
    expect(DEFAULT_CLIENT_SETTINGS_CONTRACT.details.business.kvkNumber).toBe(false)
    expect(DEFAULT_CLIENT_SETTINGS_CONTRACT.details.business.establishmentNumber).toBe(false)
    expect(DEFAULT_CLIENT_SETTINGS_CONTRACT.details.hours).toBe(false)
  })

  it("lets site manifests narrow the supported settings surface", () => {
    const manifest = manifestSchema.parse({
      version: 1,
      inlineMarks: { bold: true },
      blockTypes: { paragraph: true },
      settings: {
        general: { language: true },
        identity: { branding: { logo: true } },
        details: { business: { kvkNumber: true, establishmentNumber: true } },
        operations: { maintenance: true },
      },
    })

    expect(resolveSettingsContract(manifest)).toMatchObject({
      general: {
        description: false,
        language: true,
        contactEmail: false,
      },
      identity: {
        branding: { logo: true, favicon: false },
        footer: { tagline: false, copyright: false },
      },
      details: {
        business: {
          legalName: false,
          kvkNumber: true,
          establishmentNumber: true,
        },
        serviceArea: false,
        hours: false,
      },
      operations: { maintenance: true },
    })
  })

  it("passes the resolved contract into both settings routes", () => {
    expect(source("src/app/(frontend)/(admin)/sites/[slug]/settings/page.tsx")).toContain("resolveSettingsContract(tenant.siteManifest")
    expect(source("src/app/(frontend)/(admin)/settings/page.tsx")).toContain("resolveSettingsContract(ctx.tenant.siteManifest")
  })

  it("renders settings fields from the contract instead of unconditional Amicare-shaped groups", () => {
    const form = source("src/components/forms/SettingsForm.tsx")

    expect(form).toContain("settingsContract.operations.maintenance")
    expect(form).toContain('key: "brand"')
    expect(form).not.toContain('key: "identity"')
    expect(form).not.toContain('key: "details"')
    expect(form).not.toContain('{ name: "kvkNumber", type: "text", label: t("kvkNumber") },')
    expect(form).not.toContain('name: "language"')
    expect(form).not.toContain("openingHours")
    expect(form).not.toContain("descriptionDescription")
    expect(form).not.toContain("languageDescription")
  })
})
