import "server-only"

export type AnalyticsAccessContext = {
  mode: "tenant" | "global"
  tenant?: { id: string | number } | null
  user?: { role?: string | null } | null
}

export const canQueryTenantAnalytics = (ctx: AnalyticsAccessContext, tenantId: string | number): boolean => {
  if (ctx.user?.role === "super-admin") return true
  if (ctx.mode !== "tenant" || !ctx.tenant) return false
  return String(ctx.tenant.id) === String(tenantId)
}
