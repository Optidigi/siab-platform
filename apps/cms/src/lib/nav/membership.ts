// OBS-21 — derive whether a page is currently a `page`-type entry in a
// tenant's header / footer navigation. The page-flag toggles on the page
// editor are a view over this membership (single source of truth = the
// SiteSettings nav lists; there are no per-page nav columns).

type NavRow = { type?: string | null; page?: unknown }

/** Normalise a nav-entry `page` relationship value (populated object or bare id). */
export const navEntryPageId = (page: unknown): number | null => {
  if (page == null) return null
  if (typeof page === "object" && "id" in (page as object)) {
    const v = (page as { id: unknown }).id
    return v == null ? null : Number(v)
  }
  return Number(page)
}

const zoneHasPage = (zone: NavRow[] | null | undefined, pageId: number): boolean =>
  (zone ?? []).some((e) => e?.type === "page" && navEntryPageId(e?.page) === pageId)

/** Header / footer membership for a given page id. */
export function pageNavMembership(
  settings: { navHeader?: NavRow[] | null; navFooter?: NavRow[] | null },
  pageId: number,
): { inHeader: boolean; inFooter: boolean } {
  return {
    inHeader: zoneHasPage(settings.navHeader, pageId),
    inFooter: zoneHasPage(settings.navFooter, pageId),
  }
}
