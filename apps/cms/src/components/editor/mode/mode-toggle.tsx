"use client"
import * as React from "react"
import { SegmentedPill } from "@/components/common/segmented-pill"
import { LayoutGrid, PanelLeft } from "lucide-react"
import { useTranslations } from "next-intl"

/**
 * Editor view mode. Canvas = WYSIWYG inline editing; sidebar = select-only
 * canvas with a right-hand drill-down inspector.
 */
export type EditorMode = "canvas" | "sidebar"

/**
 * Two-state Canvas / Sidebar toggle — thin opinionated wrapper around
 * SegmentedPill with the items baked in. Used by editor chrome to flip
 * between the WYSIWYG canvas view and the inspector-driven sidebar view.
 */
export const ModeToggle: React.FC<{
  mode: EditorMode
  onChange: (next: EditorMode) => void
  className?: string
}> = ({ mode, onChange, className }) => {
  const t = useTranslations("editor")
  return (
    <SegmentedPill<EditorMode>
      ariaLabel={t("editorView")}
      value={mode}
      onValueChange={(next) => next && onChange(next)}
      allowDeselect={false}
      labelBreakpoint="md"
      items={[
        { value: "canvas",  label: t("canvas"),  icon: LayoutGrid, ariaLabel: t("canvasView") },
        { value: "sidebar", label: t("sidebar"), icon: PanelLeft,  ariaLabel: t("sidebarView") },
      ]}
      className={className}
    />
  )
}
