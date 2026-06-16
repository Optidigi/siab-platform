import { notFound } from "next/navigation"
import { requireRole, type GateResult } from "@/lib/authGate"
import { getTenantBySlug } from "@/lib/queries/tenants"
import { assertSelectedTenantRouteAccess } from "@/lib/selectedTenantRoute"
import type { Tenant, User } from "@/payload-types"

type Role = NonNullable<User["role"]>

type SelectedSiteResult = GateResult & { tenant: Tenant }

const loadSelectedTenant = async (slug: string): Promise<Tenant> => {
  const tenant = await getTenantBySlug(slug)
  if (!tenant) notFound()
  return tenant
}

export const requireSuperAdminSelectedSite = async (
  slug: string,
): Promise<SelectedSiteResult> => {
  const gate = await requireRole(["super-admin"])
  const tenant = await loadSelectedTenant(slug)
  return { ...gate, tenant }
}

export const requireOwnerSelectedSite = async (
  slug: string,
  roles: Role[] = ["super-admin", "owner"],
): Promise<SelectedSiteResult> => {
  const gate = await requireRole(roles)
  const tenant = await loadSelectedTenant(slug)
  assertSelectedTenantRouteAccess(gate.ctx, tenant)
  return { ...gate, tenant }
}
