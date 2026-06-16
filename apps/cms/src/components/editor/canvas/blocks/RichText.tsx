"use client"
import * as React from "react"
import { RtSlot } from "../inline/RtSlot"
import type { CanvasBlockRendererProps } from "@/components/editor/canvas/CanvasBlockRenderer"
import { useTranslations } from "next-intl"

/**
 * Canvas-mode renderer for the RichText block.
 *
 * Emits the same DOM class structure as siab-site-template's RichText.tsx
 * so tenant CSS targets the same classes.
 *
 * Fields:
 *   - body: block rich-text → RtSlot (full prose)
 */
export const RichTextCanvas: React.FC<CanvasBlockRendererProps> = ({ block, isActive, manifest, onActivate, onUpdate }) => {
  const t = useTranslations("editor")
  const set = (field: string) => (value: any) => onUpdate({ ...block, [field]: value })
  const idx = block.__index as number

  return (
    <section
      id={block.anchor || undefined}
      className="cms-block cms-block--richtext px-6 py-20 @min-[816px]/site-frame:px-12 @min-[816px]/site-frame:py-24 @min-[1088px]/site-frame:px-24"
      data-block-index={block.__index ?? undefined}
      data-active={isActive || undefined}
      onClick={onActivate}
    >
      <div
        className="prose mx-auto max-w-prose text-[17px] leading-[1.7] text-ink/90 @min-[816px]/site-frame:text-[18px] prose-headings:font-serif prose-headings:tracking-[-0.01em] prose-headings:text-ink prose-h2:text-[34px] prose-h2:leading-[1.1] @min-[816px]/site-frame:prose-h2:text-[44px] prose-p:text-ink/90 prose-strong:text-ink prose-strong:font-semibold prose-em:text-accent prose-em:italic prose-a:text-accent prose-a:underline prose-a:decoration-1 prose-a:underline-offset-[6px] hover:prose-a:decoration-accent prose-blockquote:border-l-2 prose-blockquote:border-accent prose-blockquote:pl-6 prose-blockquote:italic prose-blockquote:font-serif prose-blockquote:text-[19px] @min-[816px]/site-frame:prose-blockquote:text-[22px] [font-family:var(--font-text)]"
      >
        <RtSlot
          variant="block"
          manifest={manifest}
          value={block.body}
          onChange={set("body")}
          placeholder={t("longFormContentPlaceholder")}
          elementPath={{ blockIndex: idx, field: "body" }}
          allowFontFamily
        />
      </div>
    </section>
  )
}
