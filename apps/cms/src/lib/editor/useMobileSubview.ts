"use client"
import { useSearchParams } from "next/navigation"
import { useCallback, useEffect, useState } from "react"

export type MobileSubview =
  | { kind: "overview" }
  | { kind: "section"; index: number }
  | { kind: "page-settings" }
  | { kind: "seo" }

/**
 * Reads + writes the mobile editor's current sub-view from the URL search
 * params using the History API directly, bypassing the Next.js App Router.
 *
 * Why bypass the router: in dev mode, every router.push/replace causes the
 * HMR runtime to remove + re-insert the layout stylesheet <link>, producing
 * a visible one-frame flicker. The History API is silent — no flicker, and
 * deep-linking + browser back/forward still work because pushState entries
 * are honoured by the browser and popstate fires for back/forward taps.
 *
 * Initial state is seeded from useSearchParams (SSR-safe, matches the URL
 * the page was rendered with). Subsequent updates write to local state
 * AND push/replace the URL silently via window.history.
 *
 * Query param model:
 *   ?section=N           → section view focused on block N
 *   ?page=settings|seo   → page-level sub-view
 *   (neither)            → overview
 */
export function useMobileSubview() {
  const initialParams = useSearchParams()
  const [view, setView] = useState<MobileSubview>(() => parseView(initialParams))

  useEffect(() => {
    const onPop = () => {
      if (typeof window === "undefined") return
      setView(parseView(new URLSearchParams(window.location.search)))
    }
    window.addEventListener("popstate", onPop)
    return () => window.removeEventListener("popstate", onPop)
  }, [])

  const goto = useCallback((next: MobileSubview, opts?: { replace?: boolean }) => {
    setView(next)
    if (typeof window === "undefined") return
    const sp = new URLSearchParams(window.location.search)
    sp.delete("section")
    sp.delete("page")
    if (next.kind === "section") sp.set("section", String(next.index))
    if (next.kind === "page-settings") sp.set("page", "settings")
    if (next.kind === "seo") sp.set("page", "seo")
    const qs = sp.toString()
    const href = qs ? `${window.location.pathname}?${qs}` : window.location.pathname
    // push for cross-kind transitions (overview ↔ section/page-settings/seo)
    // so browser back works as expected. replace for same-kind lateral
    // navigation (section N → section N+1 via prev/next/jump) to avoid
    // bloating history with one entry per chevron tap.
    if (opts?.replace) window.history.replaceState(null, "", href)
    else window.history.pushState(null, "", href)
  }, [])

  return { view, goto }
}

function parseView(params: ReturnType<typeof useSearchParams> | URLSearchParams | null): MobileSubview {
  const get = (k: string): string | null => params?.get(k) ?? null
  const pageParam = get("page")
  if (pageParam === "settings") return { kind: "page-settings" }
  if (pageParam === "seo") return { kind: "seo" }
  const sectionParam = get("section")
  if (sectionParam != null) {
    const n = Number(sectionParam)
    if (!Number.isNaN(n) && n >= 0) return { kind: "section", index: n }
  }
  return { kind: "overview" }
}
