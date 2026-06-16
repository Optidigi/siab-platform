"use client"
import * as React from "react"
import { LexicalComposer } from "@lexical/react/LexicalComposer"
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin"
import { ContentEditable } from "@lexical/react/LexicalContentEditable"
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin"
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin"
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary"
import { ListPlugin } from "@lexical/react/LexicalListPlugin"
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin"
import { buildLexicalNodes, buildEditorTheme } from "@/lib/richText/lexical/buildNodeConfig"
import { rtToLexicalJson } from "@/lib/richText/lexical/rtToLexical"
import { lexicalJsonToRt } from "@/lib/richText/lexical/lexicalToRt"
import type { RtRoot } from "@/lib/richText/RtNode"
import type { RtManifest } from "@/lib/richText/manifest"
import { Toolbar } from "@/components/editor/richText/toolbar/toolbar"
import { LinkPopover } from "@/components/editor/richText/toolbar/link-popover"
import { SlashMenu } from "@/components/editor/richText/toolbar/slash-menu"
import { PastePlugin } from "./PastePlugin"
import { InlineConstraintPlugin } from "./InlineConstraintPlugin"
import { FloatingToolbar } from "@/components/editor/richText/toolbar/floating-toolbar"
import { RtClassSyncPlugin } from "./RtClassSyncPlugin"
// Side-effect import: registers ThemedPill into ThemedNode's component
// registry (registerThemedPill at module bottom). Without this, Lexical's
// ThemedNode.decorate() runs before any ThemedPill code executes and renders
// the FallbackPill ("[themed: <id>]"). Importing here guarantees registration
// happens before any LexicalComposer mounts.
import "@/components/editor/richText/toolbar/themed-pill"

export interface LexicalFieldProps {
  value: RtRoot | undefined
  onChange: (next: RtRoot) => void
  manifest: RtManifest
  variant: "block" | "inline"
  placeholder?: string
  className?: string
  /** Editor chrome.
   *  "full"  (default) — bordered wrapper + persistent Toolbar (form mode).
   *  "bare"  — no wrapper border, no padding, no persistent Toolbar; the
   *            content-editable renders inline so it visually matches the
   *            rendered site. Used by canvas mode (RtSlot). A FloatingToolbar
   *            handles formatting on selection instead. */
  chrome?: "full" | "bare"
  /** When false, the editor is rendered read-only (non-interactive). Used by
   *  RtSlot in sidebar select-mode so the rich-text content is visible but not
   *  editable — the slot becomes a click target for element selection instead.
   *  Defaults to true. */
  editable?: boolean
  /** When true, the font-family chip is enabled in the toolbar(s). Dedicated
   *  RichText blocks opt in while small inline fields stay governed by role
   *  fonts. */
  allowFontFamily?: boolean
}

export const LexicalField: React.FC<LexicalFieldProps> = ({ value, onChange, manifest, variant, placeholder, className, chrome = "full", editable = true, allowFontFamily = false }) => {
  const initialValue: RtRoot = value ?? (variant === "block"
    ? { t: "root", variant: "block", children: [] }
    : { t: "root", variant: "inline", children: [] })

  const editorConfig = React.useMemo(() => ({
    namespace: "rt",
    nodes: buildLexicalNodes(variant),
    theme: buildEditorTheme(),
    editorState: JSON.stringify(rtToLexicalJson(initialValue, manifest)),
    onError: (e: Error) => { throw e },
    editable,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [variant])
  // Note: initialValue is captured at first mount only. Lexical owns the state thereafter.

  const [linkOpen, setLinkOpen] = React.useState(false)

  const isBare = chrome === "bare"

  // The editor surface: in bare (canvas) mode this is rendered with NO wrapper
  // element — the ContentEditable + placeholder become direct children of the
  // RtSlot's tag, so no extra `<div>` is interposed (a `<div>` inside an
  // inline `RtSlot` tag is what produced the validateDOMNesting errors). In
  // full (form) mode the bordered card wrapper + persistent Toolbar stay.
  const surface = isBare ? (
    <RichTextPlugin
      contentEditable={
        <ContentEditable
          className={["rt-content-bare", !editable ? "pointer-events-none select-none" : ""].filter(Boolean).join(" ")}
          spellCheck={false}
        />
      }
      placeholder={
        <div className="rt-placeholder pointer-events-none text-muted-foreground">{placeholder ?? ""}</div>
      }
      ErrorBoundary={LexicalErrorBoundary}
    />
  ) : (
    <div className={className ?? "rt-field rounded-md border border-border"}>
      <Toolbar manifest={manifest} variant={variant} allowFontFamily={allowFontFamily} onOpenLink={() => setLinkOpen(true)} />
      <div className="rt-field-body relative">
        <RichTextPlugin
          contentEditable={<ContentEditable className="rt-content min-h-[2.5rem] outline-none px-3 py-2" spellCheck={false} />}
          placeholder={
            <div className="rt-placeholder pointer-events-none text-muted-foreground px-3 py-2">{placeholder ?? ""}</div>
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
      </div>
    </div>
  )

  return (
    <LexicalComposer initialConfig={editorConfig}>
      {surface}
      <HistoryPlugin />
      {variant === "block" && <ListPlugin />}
      <LinkPlugin />
      {variant === "block" && <SlashMenu manifest={manifest} />}
      <OnChangePlugin
        ignoreSelectionChange
        onChange={(editorState) => {
          editorState.read(() => {
            const json = editorState.toJSON()
            const rt = lexicalJsonToRt(json as any, variant)
            onChange(rt)
          })
        }}
      />
      <LinkPopover open={linkOpen} onClose={() => setLinkOpen(false)} />
      <PastePlugin variant={variant} />
      <RtClassSyncPlugin />
      {variant === "inline" && <InlineConstraintPlugin />}
      {isBare && <FloatingToolbar manifest={manifest} variant={variant} allowFontFamily={allowFontFamily} onOpenLink={() => setLinkOpen(true)} />}
    </LexicalComposer>
  )
}
