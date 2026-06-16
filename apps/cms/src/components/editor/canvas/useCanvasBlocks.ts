"use client"
import * as React from "react"
import { useFormContext } from "react-hook-form"
import type { RtManifest } from "@/lib/richText/manifest"

export interface CanvasBlocksApi {
  blocks: any[]
  activeIndex: number | null
  setActiveIndex: React.Dispatch<React.SetStateAction<number | null>>
  updateBlock: (i: number) => (next: any) => void
  insertBlockAt: (i: number, slug: string, seed?: Record<string, unknown>) => void
  deleteBlock: (i: number) => void
  duplicateBlock: (i: number) => void
  reorderBlocks: (from: number, to: number) => void
}

export function useCanvasBlocks(manifest?: RtManifest): CanvasBlocksApi {
  const { watch, setValue } = useFormContext()
  const blocks: any[] = watch("blocks") ?? []
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null)

  const updateBlock = (i: number) => (next: any) => {
    const copy = [...blocks]
    copy[i] = next
    setValue("blocks", copy, { shouldDirty: true })
  }

  /** Insert a minimal new block of the given type at position i.
   *  Optional `seed` merges extra initial field values (e.g. from a preset).
   *  When the manifest declares a `defaultAnchor` for this slug, it pre-fills
   *  `anchor`. An explicit `seed.anchor` still wins — presets are the more
   *  specific source. */
  const insertBlockAt = (i: number, slug: string, seed?: Record<string, unknown>) => {
    const defaultAnchor = manifest?.blocks?.find((m) => m.slug === slug)?.defaultAnchor
    const next = [...blocks]
    next.splice(i, 0, {
      blockType: slug,
      ...(defaultAnchor ? { anchor: defaultAnchor } : {}),
      ...seed,
    })
    setValue("blocks", next, { shouldDirty: true })
    setActiveIndex(i)
  }

  const deleteBlock = (i: number) => {
    const next = [...blocks]
    next.splice(i, 1)
    setValue("blocks", next, { shouldDirty: true })
    // Adjust activeIndex: if the deleted block was active, deactivate;
    // if a block after the deleted block was active, shift index down.
    setActiveIndex((prev) => {
      if (prev === null) return null
      if (prev === i) return null
      if (prev > i) return prev - 1
      return prev
    })
  }

  const duplicateBlock = (i: number) => {
    const next = [...blocks]
    const clone = JSON.parse(JSON.stringify(next[i]))
    next.splice(i + 1, 0, clone)
    setValue("blocks", next, { shouldDirty: true })
    setActiveIndex(i + 1)
  }

  const reorderBlocks = (from: number, to: number) => {
    const next = [...blocks]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    setValue("blocks", next, { shouldDirty: true })
    setActiveIndex((prev) => {
      if (prev === from) return to
      if (prev === null) return null
      // Shift other indices
      if (from < to) {
        if (prev > from && prev <= to) return prev - 1
      } else {
        if (prev >= to && prev < from) return prev + 1
      }
      return prev
    })
  }

  return {
    blocks,
    activeIndex,
    setActiveIndex,
    updateBlock,
    insertBlockAt,
    deleteBlock,
    duplicateBlock,
    reorderBlocks,
  }
}
