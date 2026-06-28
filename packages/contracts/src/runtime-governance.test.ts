import { describe, expect, it } from "vitest"
import {
  amblastPublishedSiteSnapshot,
  amblastSiteGenerationSpec,
  amicarePublishedSiteSnapshot,
  amicareSiteGenerationSpec,
} from "./fixtures/tenants"
import {
  GeneratedSiteSettingsSchema,
  OfficialTenantPublishedSiteSnapshotSchema,
  OfficialTenantSiteGenerationSpecSchema,
  PublishedSiteSnapshotSchema,
  schemaForPublishedSiteSnapshot,
  SiteGenerationSpecSchema,
} from "./runtime"

describe("runtime generation governance", () => {
  it("rejects tenant-exclusive chrome variants from generic settings", () => {
    expect(GeneratedSiteSettingsSchema.safeParse(amicareSiteGenerationSpec.settings).success).toBe(false)
    expect(GeneratedSiteSettingsSchema.safeParse(amblastSiteGenerationSpec.settings).success).toBe(false)
  })

  it("rejects tenant-exclusive block and chrome variants from generic generation contracts", () => {
    expect(SiteGenerationSpecSchema.safeParse(amicareSiteGenerationSpec).success).toBe(false)
    expect(SiteGenerationSpecSchema.safeParse(amblastSiteGenerationSpec).success).toBe(false)
    expect(PublishedSiteSnapshotSchema.safeParse(amicarePublishedSiteSnapshot).success).toBe(false)
    expect(PublishedSiteSnapshotSchema.safeParse(amblastPublishedSiteSnapshot).success).toBe(false)
  })

  it("preserves official tenant generation and published snapshot validation", () => {
    expect(OfficialTenantSiteGenerationSpecSchema.safeParse(amicareSiteGenerationSpec).success).toBe(true)
    expect(OfficialTenantSiteGenerationSpecSchema.safeParse(amblastSiteGenerationSpec).success).toBe(true)
    expect(OfficialTenantPublishedSiteSnapshotSchema.safeParse(amicarePublishedSiteSnapshot).success).toBe(true)
    expect(OfficialTenantPublishedSiteSnapshotSchema.safeParse(amblastPublishedSiteSnapshot).success).toBe(true)
  })

  it("selects the official published snapshot schema for official tenant slugs", () => {
    expect(schemaForPublishedSiteSnapshot(amicarePublishedSiteSnapshot).safeParse(amicarePublishedSiteSnapshot).success).toBe(true)
    expect(schemaForPublishedSiteSnapshot(amblastPublishedSiteSnapshot).safeParse(amblastPublishedSiteSnapshot).success).toBe(true)

    const genericTenantSnapshot = {
      ...amicarePublishedSiteSnapshot,
      tenantSlug: "future-tenant",
    }
    expect(schemaForPublishedSiteSnapshot(genericTenantSnapshot).safeParse(genericTenantSnapshot).success).toBe(false)
  })

  it("does not allow official tenant variants to cross tenant ownership", () => {
    expect(OfficialTenantSiteGenerationSpecSchema.safeParse({
      ...amicareSiteGenerationSpec,
      tenant: { ...amicareSiteGenerationSpec.tenant, slug: "amblast" },
    }).success).toBe(false)

    expect(OfficialTenantPublishedSiteSnapshotSchema.safeParse({
      ...amblastPublishedSiteSnapshot,
      tenantSlug: "amicare",
    }).success).toBe(false)
  })
})
