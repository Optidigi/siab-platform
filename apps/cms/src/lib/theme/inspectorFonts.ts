import type { CSSProperties } from "react"
import type { ThemeTokens } from "./schema"
import type { ElementRole } from "@/components/editor/canvas/blockElements"

export function inspectorFontStyle(theme: ThemeTokens | null | undefined): CSSProperties {
  // Always stamp the inspector vars. When the user picked a font preset in
  // ThemeBar, theme.fonts.* wins. Otherwise we fall through to the tenant
  // bundle's --rt-tenant-font-* (emitted at admin :root by loadTenantCss
  // alongside the .rt-canvas-scoped copy) and finally to inherit so the
  // inspector reads admin chrome when no tenant CSS is loaded.
  return {
    "--rt-inspector-font-title":   theme?.fonts?.title   || "var(--rt-tenant-font-title, inherit)",
    "--rt-inspector-font-heading": theme?.fonts?.heading || "var(--rt-tenant-font-heading, inherit)",
    "--rt-inspector-font-text":    theme?.fonts?.text    || "var(--rt-tenant-font-text, inherit)",
  } as CSSProperties
}

export function roleToFontFamily(role: ElementRole | undefined): string {
  switch (role) {
    case "title":   return "var(--rt-inspector-font-title, inherit)"
    case "heading": return "var(--rt-inspector-font-heading, inherit)"
    case "text":    return "var(--rt-inspector-font-text, inherit)"
    // theme.fonts has no script slot today; fall through to admin chrome
    // rather than mislead with the title font. Filed as a future
    // enhancement (read --font-script from tenant CSS into inspector scope).
    case "script":  return "inherit"
    default:        return "inherit"
  }
}
