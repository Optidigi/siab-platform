import type { LucideIcon } from "lucide-react"
import type { Block } from "payload"

/**
 * Shared truncation helper for block summary pills.
 * Truncates a string to `n` characters, appending an ellipsis if needed.
 */
export function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s
}

export const firstRichText = (node: unknown): string | undefined => {
  if (!node) return undefined
  if (typeof node === "object" && node !== null) {
    const value = node as { t?: unknown; v?: unknown; children?: unknown; items?: unknown }
    if (value.t === "text" && typeof value.v === "string" && value.v) return value.v
    const children = Array.isArray(value.children)
      ? value.children
      : Array.isArray(value.items)
        ? value.items
        : []
    for (const child of children) {
      const text = firstRichText(child)
      if (text) return text
    }
  }
  return undefined
}

export type BlockMeta = {
  description?: string
  icon?: LucideIcon
}

export type BlockWithMeta = Block & BlockMeta & {
  summary?: (v: Record<string, unknown>) => string | undefined
}
