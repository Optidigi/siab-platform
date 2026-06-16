"use server"
import { headers } from "next/headers"
import { getPayload } from "payload"
import config from "@/payload.config"
import { navEntryPageId } from "@/lib/nav/membership"

// OBS-21 — add or remove a page from a tenant's header / footer navigation.
//
// The page-editor "Include in header/footer nav" toggles call this directly.
// It's a thin mutation over SiteSettings.navHeader / navFooter: toggling ON
// appends a `{ type: "page", page }` entry; toggling OFF drops every
// page-entry for that page. Single source of truth — no per-page columns.
//
// Authorization is Payload's: SiteSettings.access.update = canUpdateSettings
// (owner + super-admin), and the multi-tenant plugin scopes the write to the
// caller's tenant. Same `overrideAccess: false, user` path as updateNav.
// (Editors can edit page content but not nav — the page editor only shows
// these toggles to owner/super-admin.)

type NavRow = {
  type?: string | null
  page?: unknown
  anchor?: string | null
  url?: string | null
  label?: string | null
  external?: boolean | null
}

// Re-serialise a stored row to the plain shape `payload.update` expects —
// drops the Payload array-row `id` (regenerated) and flattens `page` to its id.
const plain = (r: NavRow) => ({
  type: r.type,
  page: navEntryPageId(r.page),
  anchor: r.anchor ?? null,
  url: r.url ?? null,
  label: r.label ?? null,
  external: !!r.external,
})

export const togglePageInNav = async (
  tenantId: number | string,
  pageId: number | string,
  zone: "header" | "footer",
  included: boolean,
): Promise<void> => {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (!user) throw new Error("Forbidden: authentication required")

  const found = await payload.find({
    collection: "site-settings",
    where: { tenant: { equals: tenantId } },
    limit: 1,
    depth: 0,
    user,
    overrideAccess: false,
  })
  const settings = found.docs[0]
  if (!settings) throw new Error("Forbidden: no site settings accessible for this tenant")

  const field = zone === "header" ? "navHeader" : "navFooter"
  const current: NavRow[] = ((settings as any)[field] ?? []) as NavRow[]
  const pid = Number(pageId)

  // Remove any existing page-entry for this page either way; re-add one when
  // toggling ON. This is idempotent and de-dupes if the list somehow held
  // two entries for the same page.
  const withoutThisPage = current
    .map(plain)
    .filter((e) => !(e.type === "page" && e.page === pid))
  const next = included
    ? [...withoutThisPage, { type: "page", page: pid, anchor: null, url: null, label: null, external: false }]
    : withoutThisPage

  await payload.update({
    collection: "site-settings",
    id: settings.id,
    data: { [field]: next } as any,
    user,
    overrideAccess: false,
  })
}
