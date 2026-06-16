import { notFound } from "next/navigation"
import type { SiabContext } from "@/lib/context"
import { sameRelationshipId } from "@/lib/relationshipId"
import type { Tenant } from "@/payload-types"

type TenantRouteRef = { id: Tenant["id"] | string }

export const canAccessSelectedTenantRoute = (
  ctx: SiabContext,
  tenant: TenantRouteRef
): boolean => {
  if (ctx.mode === "super-admin") return true
  return sameRelationshipId(ctx.tenant.id, tenant.id)
}

export const assertSelectedTenantRouteAccess = (
  ctx: SiabContext,
  tenant: TenantRouteRef
) => {
  if (!canAccessSelectedTenantRoute(ctx, tenant)) notFound()
}
