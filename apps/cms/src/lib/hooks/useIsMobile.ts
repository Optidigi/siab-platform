"use client"
import * as React from "react"

const QUERY = "(max-width: 767px)"

export const useIsMobile = (): boolean => {
  return React.useSyncExternalStore(
    (cb) => {
      const mql = window.matchMedia(QUERY)
      mql.addEventListener("change", cb)
      return () => mql.removeEventListener("change", cb)
    },
    () => window.matchMedia(QUERY).matches,
    () => false,
  )
}
