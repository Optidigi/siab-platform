"use client"
import * as React from "react"
import type { ElementPath } from "@/components/editor/canvas/elementPath"

/**
 * When `selected` changes, scroll the target element into view and stamp
 * [data-rt-pulse="true"] on it for the arrival-pulse animation (globals.css).
 * The pulse attribute is removed afterward so re-selecting re-fires it.
 *
 * Target resolution (in order):
 * 1. Element-level: the inline primitive carrying [data-rt-selected="true"].
 *    This is set when `selected.field` is non-empty and an inline primitive
 *    matches the full ElementPath.
 * 2. Block-level fallback: [data-block-index="${selected.blockIndex}"].
 *    Used when the sidebar drills into a block without selecting a specific
 *    field (i.e. field is ""), or when the inline primitive hasn't mounted yet.
 *
 * `containerRef` must point at an element that contains the canvas surface
 * (the `.rt-canvas` element or an ancestor). Scrolling uses scrollIntoView,
 * which finds the nearest scrollable ancestor — that is PageForm's canvas
 * scroll region.
 */
export function useScrollToSelection(
  containerRef: React.RefObject<HTMLElement | null>,
  selected: ElementPath | null,
) {
  React.useEffect(() => {
    if (selected == null) return
    const container = containerRef.current
    if (!container) return
    // Defer one frame so the inline primitives have re-rendered with the new
    // data-rt-selected attribute before we query for it.
    let timeoutId: number | undefined
    const raf = requestAnimationFrame(() => {
      // Prefer element-level target (set by inline primitives when field matches).
      let el = container.querySelector<HTMLElement>('[data-rt-selected="true"]')
      // Fall back to the block container when no element-level target is found
      // (e.g. sidebar selects a block without a specific field, or field === "").
      if (!el) {
        el = container.querySelector<HTMLElement>(`[data-block-index="${selected.blockIndex}"]`)
      }
      if (!el) return
      el.scrollIntoView({ block: "center", behavior: "smooth" })
      el.setAttribute("data-rt-pulse", "true")
      timeoutId = window.setTimeout(() => el!.removeAttribute("data-rt-pulse"), 1700)
    })
    return () => {
      cancelAnimationFrame(raf)
      if (timeoutId !== undefined) clearTimeout(timeoutId)
    }
  }, [containerRef, selected])
}
