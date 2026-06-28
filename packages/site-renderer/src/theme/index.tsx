import * as React from "react"
import type { ThemeTokenSpec } from "@siteinabox/contracts"
import { themeToCssVars, type ThemeCssVarScope } from "./css-vars"

export * from "./css-vars"

export function ThemeStyle({
  theme,
  scope = ".rt-canvas",
  nonce,
}: {
  theme?: ThemeTokenSpec | null
  scope?: ThemeCssVarScope
  nonce?: string
}) {
  const css = themeToCssVars(theme, scope)
  if (!css) return null

  return (
    <style
      nonce={nonce}
      suppressHydrationWarning
      data-siab-theme-overrides
      dangerouslySetInnerHTML={{ __html: css }}
    />
  )
}
