// OBS-20 — shared types for the navigation manager UI. The stored shape
// mirrors a SiteSettings.navHeader / navFooter row, flattened (page
// relationship normalised to a bare id) for the client components.

export type NavEntryType = "page" | "section" | "custom"

export type NavEntry = {
  type: NavEntryType
  /** Target page id — used by `page` and `section` entries. */
  page: number | null
  /** Section anchor id (without `#`) — `section` entries. */
  anchor: string | null
  /** Arbitrary URL — `custom` entries. */
  url: string | null
  /** Display text. Optional for `page` (falls back to the page title). */
  label: string | null
  /** Open in a new tab — `custom` entries. */
  external: boolean
}

export type NavPageOption = {
  id: number
  title: string
  slug: string
  status: string
  /** Block anchor ids declared on this page — the section-link picker list. */
  anchors: string[]
}

export type NavZone = "header" | "footer"

export const emptyEntry = (type: NavEntryType): NavEntry => ({
  type,
  page: null,
  anchor: null,
  url: null,
  label: null,
  external: false,
})
