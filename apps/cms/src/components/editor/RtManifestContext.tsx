"use client"

import * as React from "react"
import type { RtManifest } from "@/lib/richText/manifest"

const RtManifestContext = React.createContext<RtManifest | null>(null)

export function RtManifestProvider({
  manifest,
  children,
}: {
  manifest: RtManifest
  children: React.ReactNode
}) {
  return <RtManifestContext.Provider value={manifest}>{children}</RtManifestContext.Provider>
}

export const useRtManifest = (): RtManifest => {
  const value = React.useContext(RtManifestContext)
  if (!value) throw new Error("RtManifestContext: no manifest provided")
  return value
}
