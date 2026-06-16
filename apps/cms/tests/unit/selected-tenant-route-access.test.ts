import { describe, expect, it } from "vitest"
import { canAccessSelectedTenantRoute } from "@/lib/selectedTenantRoute"
import type { SiabContext } from "@/lib/context"
import type { Tenant } from "@/payload-types"

const tenantA = { id: 1, slug: "tenant-a" } as Tenant
const tenantB = { id: 2, slug: "tenant-b" } as Tenant

const ctxSuper: SiabContext = { mode: "super-admin", tenant: null }
const ctxTenantA: SiabContext = { mode: "tenant", tenant: tenantA }

describe("selected site route tenant boundary", () => {
  it("allows super-admin selected-site routes for any tenant", () => {
    expect(canAccessSelectedTenantRoute(ctxSuper, tenantA)).toBe(true)
    expect(canAccessSelectedTenantRoute(ctxSuper, tenantB)).toBe(true)
  })

  it("allows tenant-host selected-site routes only for the current tenant", () => {
    expect(canAccessSelectedTenantRoute(ctxTenantA, tenantA)).toBe(true)
    expect(canAccessSelectedTenantRoute(ctxTenantA, tenantB)).toBe(false)
  })

  it("compares numeric and string IDs consistently", () => {
    expect(canAccessSelectedTenantRoute(ctxTenantA, { id: "1" })).toBe(true)
    expect(canAccessSelectedTenantRoute(ctxTenantA, { id: "2" })).toBe(false)
  })
})
