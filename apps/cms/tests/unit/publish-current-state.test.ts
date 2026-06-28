import { readFileSync } from "node:fs"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  publishSiteSnapshot: vi.fn(),
}))

vi.mock("@/lib/publish/siteSnapshots", () => ({
  publishSiteSnapshot: mocks.publishSiteSnapshot,
}))

import {
  canPublishCurrentTenantState,
  publishCurrentTenantState,
} from "@/lib/publish/currentState"

const payload = (tenant: { id: number; slug: string; domain: string }) => ({
  findByID: vi.fn(async () => tenant),
})

describe("publish current tenant state", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.publishSiteSnapshot.mockResolvedValue({
      activated: true,
      snapshot: { id: 12, status: "active", version: 3, domain: "ami-care.nl" },
    })
  })

  it("lets tenant editors publish and activate their own official tenant current CMS state", async () => {
    const p = payload({ id: 7, slug: "ami-care", domain: "ami-care.nl" })
    const user = { id: 2, role: "editor", tenants: [{ tenant: { id: 7 } }] }

    await expect(canPublishCurrentTenantState(p as any, user, 7)).resolves.toBe(true)
    const result = await publishCurrentTenantState(p as any, {
      tenantId: 7,
      user,
      reason: "page editor save",
    })

    expect(result.activated).toBe(true)
    expect(mocks.publishSiteSnapshot).toHaveBeenCalledWith(p, {
      tenantId: 7,
      generationRunId: null,
      includeAllPublishedPages: true,
      activate: true,
      manualActivation: true,
      publishedBy: 2,
      activationReason: "page editor save",
    })
  })

  it("rejects tenant members for non-official tenants", async () => {
    const p = payload({ id: 7, slug: "customer-preview", domain: "customer.example" })
    const user = { id: 2, role: "owner", tenants: [{ tenant: 7 }] }

    await expect(canPublishCurrentTenantState(p as any, user, 7)).resolves.toBe(false)
    await expect(publishCurrentTenantState(p as any, { tenantId: 7, user })).rejects.toThrow(/not authorized/i)
    expect(mocks.publishSiteSnapshot).not.toHaveBeenCalled()
  })

  it("keeps PageForm on the shared server action instead of raw publish endpoint fetches", () => {
    const source = readFileSync("src/components/forms/PageForm.tsx", "utf8")

    expect(source).toContain("@/lib/actions/publishCurrentTenantState")
    expect(source).toContain("publishCurrentTenantStateAction(")
    expect(source).not.toContain('fetch("/api/publish"')
  })
})
