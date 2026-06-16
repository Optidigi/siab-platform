import type { RtManifest } from "@/lib/richText/manifest"
import type { EditorMode } from "@/components/editor/mode/mode-toggle"

// EditorMode canonical home is the local editor mode component. Re-exported
// here for backwards compatibility with siab-payload's existing import path.
// Consumers importing `@/lib/editor/editorMode` continue to work.
export type { EditorMode } from "@/components/editor/mode/mode-toggle"

/**
 * Resolve which mode the editor should open in.
 * Order:
 *   1. User's saved preference (canvas or sidebar — persisted values)
 *   2. Manifest's default mode
 *   3. Hard fallback: "canvas"
 */
export const resolveDefaultMode = (
  userPref: EditorMode | null | undefined,
  manifest: RtManifest,
): EditorMode => {
  if (userPref === "canvas" || userPref === "sidebar") return userPref
  if (manifest.defaultMode === "canvas" || manifest.defaultMode === "sidebar") return manifest.defaultMode
  return "canvas"
}
