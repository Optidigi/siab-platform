"use client"
import * as React from "react"

/**
 * Returns the bottom inset (px) that the soft keyboard occupies, i.e.
 * window.innerHeight - visualViewport.height - visualViewport.offsetTop.
 * Zero when no keyboard is present (visualViewport == window viewport).
 */
export const useVisualViewportOffset = (): number => {
  return React.useSyncExternalStore(
    (cb) => {
      const vv = window.visualViewport
      if (!vv) return () => {}
      vv.addEventListener("resize", cb)
      vv.addEventListener("scroll", cb)
      return () => {
        vv.removeEventListener("resize", cb)
        vv.removeEventListener("scroll", cb)
      }
    },
    () => {
      const vv = window.visualViewport
      if (!vv) return 0
      return Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
    },
    () => 0,
  )
}
