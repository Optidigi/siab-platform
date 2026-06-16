"use client"

import * as React from "react"
import type { Media } from "@/payload-types"

export type MediaTenantId = number | string

type FetchLike = typeof fetch

type ResolveMediaTenantIdOptions = {
  fetcher?: FetchLike
  pathname?: string
}

export async function resolveMediaTenantId({
  fetcher = fetch,
  pathname = typeof window === "undefined" ? "" : window.location.pathname,
}: ResolveMediaTenantIdOptions = {}): Promise<MediaTenantId | null> {
  const meRes = await fetcher("/api/users/me")
  if (!meRes.ok) return null

  const me = (await meRes.json()).user
  if (!me) return null

  if (me.role === "super-admin") {
    const match = pathname.match(/\/sites\/([^/]+)/)
    if (!match?.[1]) return null

    const tenantRes = await fetcher(
      `/api/tenants?where[slug][equals]=${encodeURIComponent(match[1])}&limit=1`,
    )
    if (!tenantRes.ok) return null

    const tenantJson = await tenantRes.json()
    return tenantJson.docs?.[0]?.id ?? null
  }

  const first = me.tenants?.[0]?.tenant
  return typeof first === "object" && first ? first.id : (first ?? null)
}

export async function fetchTenantMedia(
  tenantId: MediaTenantId,
  fetcher: FetchLike = fetch,
): Promise<Media[]> {
  const res = await fetcher(
    `/api/media?where[tenant][equals]=${encodeURIComponent(String(tenantId))}&limit=200&sort=-updatedAt`,
  )
  if (!res.ok) return []

  const json = await res.json()
  return (json.docs as Media[]) ?? []
}

export function useResolvedMediaTenantId(initialTenantId?: MediaTenantId | null) {
  const [resolvedTenantId, setResolvedTenantId] = React.useState<MediaTenantId | null>(
    initialTenantId ?? null,
  )

  React.useEffect(() => {
    if (resolvedTenantId != null) return

    let cancelled = false
    ;(async () => {
      const tenantId = await resolveMediaTenantId()
      if (tenantId != null && !cancelled) setResolvedTenantId(tenantId)
    })()

    return () => {
      cancelled = true
    }
  }, [resolvedTenantId])

  return resolvedTenantId
}
