import { describe, it, expect, beforeAll } from "vitest"
import { getTestPayload } from "./_helpers"

let payload: Awaited<ReturnType<typeof getTestPayload>>

beforeAll(async () => { payload = await getTestPayload() }, 30000)

const validManifest = {
  version: 1,
  inlineMarks: { bold: true },
  blockTypes: { paragraph: true },
}

describe("Tenant.siteManifest", () => {
  it("accepts a valid manifest on create", async () => {
    const ts = Date.now()
    const t = await payload.create({
      collection: "tenants",
      data: {
        name: "Test Manifest Tenant",
        slug: `test-manifest-tenant-${ts}`,
        domain: `manifest-${ts}.test`,
        siteManifest: validManifest,
      } as any,
      overrideAccess: true,
    })
    expect((t as any).siteManifest).toEqual(validManifest)
  })

  it("rejects an invalid manifest (missing paragraph)", async () => {
    await expect(payload.create({
      collection: "tenants",
      data: {
        name: "Bad", slug: `bad-${Date.now()}`, domain: `bad-${Date.now()}.test`,
        siteManifest: { version: 1, inlineMarks: {}, blockTypes: {} },
      } as any,
      overrideAccess: true,
    })).rejects.toThrow()
  })
})
