#!/usr/bin/env node

import { readdir, readFile } from "node:fs/promises"
import { join } from "node:path"

const ROOT = process.cwd()

const SHADCN_CSS = "src/styles/shadcn.css"
const PROTECTED_CSS = new Set(["src/styles/globals.css", "src/styles/siab.css"])

const UPSTREAM_UI_FILES = new Set([
  "alert.tsx",
  "avatar.tsx",
  "badge.tsx",
  "breadcrumb.tsx",
  "button.tsx",
  "card.tsx",
  "chart.tsx",
  "checkbox.tsx",
  "command.tsx",
  "dialog.tsx",
  "drawer.tsx",
  "dropdown-menu.tsx",
  "form.tsx",
  "input.tsx",
  "label.tsx",
  "pagination.tsx",
  "popover.tsx",
  "select.tsx",
  "separator.tsx",
  "sheet.tsx",
  "sidebar.tsx",
  "skeleton.tsx",
  "switch.tsx",
  "table.tsx",
  "tabs.tsx",
  "textarea.tsx",
  "toggle-group.tsx",
  "toggle.tsx",
  "tooltip.tsx",
])

const failures = []

const componentsJson = JSON.parse(await readFile(join(ROOT, "components.json"), "utf8"))
const configuredCss = componentsJson.tailwind?.css
if (configuredCss !== SHADCN_CSS) {
  failures.push(`components.json tailwind.css must be ${SHADCN_CSS}, got ${configuredCss}`)
}
if (PROTECTED_CSS.has(configuredCss)) {
  failures.push(`components.json tailwind.css points at protected CSS: ${configuredCss}`)
}

const globals = await readFile(join(ROOT, "src/styles/globals.css"), "utf8")
const expectedGlobals = '@import "./shadcn.css";\n@import "./siab.css";\n'
if (globals !== expectedGlobals) {
  failures.push("src/styles/globals.css must remain the stable shadcn/SIAB import shell")
}

const uiDir = join(ROOT, "src/components/ui")
const entries = await readdir(uiDir, { withFileTypes: true })
const unknownUiFiles = entries
  .filter((entry) => entry.isFile())
  .map((entry) => entry.name)
  .filter((name) => !UPSTREAM_UI_FILES.has(name))
  .sort()

if (unknownUiFiles.length > 0) {
  failures.push(
    [
      "src/components/ui is reserved for upstream shadcn primitive filenames only.",
      "Move new custom app components outside src/components/ui:",
      ...unknownUiFiles.map((name) => `  - ${name}`),
    ].join("\n"),
  )
}

if (failures.length > 0) {
  console.error(`✗ lint:ui-boundary failed — ${failures.length} violation(s)\n`)
  console.error(failures.join("\n\n"))
  process.exit(1)
}

console.log(
  "✓ lint:ui-boundary passed — shadcn CSS target is isolated and src/components/ui is upstream-name-only",
)
