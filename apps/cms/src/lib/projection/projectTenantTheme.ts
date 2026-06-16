import { promises as fs } from "node:fs"
import path from "node:path"
import type { ThemeTokens } from "@/lib/theme/schema"
import { toCssVars } from "@/lib/theme/toCssVars"

const dataDir = () => path.resolve(process.cwd(), process.env.DATA_DIR || "./.data-out")

export async function projectTenantTheme(
  tenantId: string,
  theme: ThemeTokens | null | undefined
): Promise<void> {
  const css = toCssVars(theme, ":root")
  const dest = path.join(dataDir(), "tenants", tenantId, "tenant-theme.css")
  try {
    await fs.writeFile(dest, css, "utf8")
  } catch (err) {
    console.error("[tenant-theme]", err)
  }
}
