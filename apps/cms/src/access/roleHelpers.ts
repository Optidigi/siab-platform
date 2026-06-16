import type { Access } from "payload"
import { relationshipId, relationshipIdSet, type RelationshipIdRef } from "@/lib/relationshipId"

/**
 * Role-layer access on top of the multi-tenant plugin's automatic
 * tenant scoping. The plugin restricts FIND queries to the user's tenant
 * for non-super-admin roles via its `withTenantAccess` wrapper, but that
 * wrapper does NOT gate CREATE against the incoming `data.tenant` — only
 * reads/updates/deletes scoped against existing rows. These helpers
 * enforce *what* each role can do AND, for writes, *which* tenant they
 * can write to.
 *
 *   - viewer  -> read only
 *   - editor  -> create / read / update / delete on Pages, Media, Forms,
 *                BlockPresets — restricted to own tenant
 *   - owner   -> editor's permissions + update SiteSettings
 *   - super-admin -> everything everywhere (bypasses tenant scoping
 *                    via plugin's userHasAccessToAllTenants)
 */

const userTenantIds = (
  user: { tenants?: Array<{ tenant: unknown }> } | undefined | null,
): Set<string> => {
  return relationshipIdSet((user?.tenants ?? []).map((t) => t.tenant as RelationshipIdRef))
}

export const canRead: Access = ({ req }) => Boolean(req.user)

export const canWrite: Access = ({ req, data }) => {
  const user = req.user
  if (!user) return false
  const role = (user as { role?: string }).role
  if (role === "super-admin") return true
  if (role !== "owner" && role !== "editor") return false

  // OBS-67: when the incoming write carries an explicit `tenant`, verify
  // the caller is a member of that tenant. Without this check, an editor
  // in tenant A can `POST /api/<collection>` with `{ tenant: B_id, ... }`
  // and pollute tenant B's content — the multi-tenant plugin's
  // withTenantAccess wrapper doesn't gate creates against incoming data.
  // Tested in `tests/unit/canWrite-tenant-membership.test.ts`.
  //
  // When `data.tenant` is absent — typical for updates that don't change
  // the relationship — we defer to the multi-tenant plugin's read-scoping
  // (the doc being updated is already tenant-restricted at fetch time,
  // and the plugin auto-fills `data.tenant` on create from the user's
  // own tenant when not provided). This keeps the gate strict on the
  // dangerous path without over-rejecting benign writes.
  if (data && typeof data === "object" && "tenant" in data) {
    const target = relationshipId((data as { tenant: unknown }).tenant as RelationshipIdRef)
    if (target != null) {
      const allowed = userTenantIds(user as { tenants?: Array<{ tenant: unknown }> })
      if (!allowed.has(target)) return false
    }
  }
  return true
}

export const canUpdateSettings: Access = ({ req }) => {
  const role = req.user?.role
  return role === "super-admin" || role === "owner"
}
