#!/usr/bin/env node
/**
 * Phase-3 canvas audit script.
 *
 * Logs in to the local CMS (http://localhost:3000), navigates to the
 * ami-care page editor, and screenshots every view-toggle in the ModeBar.
 * Console output is captured to tmp/phase-3-review/console.txt.
 *
 * Usage:
 *   pnpm audit:canvas          (alias for: node scripts/audit-canvas.mjs)
 *
 * Login helper is typed in tests/e2e/_local.ts — the ESM/TS boundary makes a
 * direct import awkward, so the ~6 lines are inlined here with a reference.
 */

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { chromium } from "@playwright/test"

// ---------------------------------------------------------------------------
// Config  (mirrors tests/e2e/_local.ts — keep in sync)
// ---------------------------------------------------------------------------
const LOCAL_BASE = "http://localhost:3000"
const AMI_PAGE = "/sites/amicare-zorg/pages/1"
const LOCAL_EMAIL = "admin@local.test"
const LOCAL_PASSWORD = "LocalTest!1234"

// ---------------------------------------------------------------------------
// Output dir
// ---------------------------------------------------------------------------
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.resolve(__dirname, "..", "tmp", "phase-3-review")
fs.mkdirSync(OUT_DIR, { recursive: true })

// ---------------------------------------------------------------------------
// Console log buffer
// ---------------------------------------------------------------------------
/** @type {string[]} */
const logLines = []

function log(line) {
  console.log(line)
  logLines.push(line)
}

function flushConsoleLog() {
  fs.writeFileSync(path.join(OUT_DIR, "console.txt"), logLines.join("\n") + "\n", "utf8")
}

// ---------------------------------------------------------------------------
// Login helper (inlined from tests/e2e/_local.ts)
// ---------------------------------------------------------------------------
/**
 * @param {import("playwright").Page} page
 */
async function loginLocal(page) {
  await page.goto(`${LOCAL_BASE}/login`, { timeout: 30_000, waitUntil: "networkidle" })

  await page.getByLabel(/email/i).fill(LOCAL_EMAIL)
  await page.getByLabel(/password/i).fill(LOCAL_PASSWORD)

  await Promise.all([
    page.waitForURL(/\/(sites|$)/, { timeout: 30_000 }),
    page.getByRole("button", { name: /sign in/i }).click(),
  ])
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
let exitCode = 0

async function main() {
  log(`[info] audit-canvas starting — ${new Date().toISOString()}`)
  log(`[info] target: ${LOCAL_BASE}${AMI_PAGE}`)

  // Verify the server is up before launching the browser (fast-fail, no hang)
  try {
    const probe = await fetch(`${LOCAL_BASE}/login`, { signal: AbortSignal.timeout(8_000) })
    if (!probe.ok && probe.status !== 200) {
      log(`[warn] login page returned HTTP ${probe.status} — continuing anyway`)
    } else {
      log(`[info] server reachable (HTTP ${probe.status})`)
    }
  } catch (err) {
    log(`[error] server not reachable at ${LOCAL_BASE}: ${err.message}`)
    log(`[error] is the dev server running? (pnpm dev)`)
    exitCode = 1
    flushConsoleLog()
    process.exit(1)
  }

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  // Capture all console messages
  page.on("console", (msg) => {
    const type = msg.type() // log | warning | error | info | ...
    const prefix = type === "error" ? "[error]" : type === "warning" ? "[warning]" : `[${type}]`
    log(`${prefix} ${msg.text()}`)
  })

  // Capture uncaught page errors
  page.on("pageerror", (err) => {
    log(`[pageerror] ${err.message}`)
    if (err.stack) log(`[pageerror-stack] ${err.stack}`)
  })

  // Capture failed / non-2xx network responses with their URL — a bare
  // "[error] Failed to load resource" console line carries no URL, so the
  // response listener is the only way to know *what* failed.
  page.on("response", (res) => {
    const status = res.status()
    if (status >= 400) {
      log(`[net ${status}] ${res.request().method()} ${res.url()}`)
    }
  })
  page.on("requestfailed", (req) => {
    log(`[net FAIL] ${req.method()} ${req.url()} — ${req.failure()?.errorText ?? "unknown"}`)
  })

  try {
    // -----------------------------------------------------------------------
    // 1. Login
    // -----------------------------------------------------------------------
    log("[info] logging in…")
    await loginLocal(page)
    log(`[info] login succeeded — now at: ${page.url()}`)

    // -----------------------------------------------------------------------
    // 2. Navigate to the page editor
    // -----------------------------------------------------------------------
    log(`[info] navigating to page editor: ${LOCAL_BASE}${AMI_PAGE}`)
    await page.goto(`${LOCAL_BASE}${AMI_PAGE}`, { timeout: 30_000, waitUntil: "networkidle" })
    log(`[info] editor loaded — URL: ${page.url()}`)

    // -----------------------------------------------------------------------
    // 3. Find the ModeBar and screenshot each view
    // -----------------------------------------------------------------------
    const modeBar = page.getByRole("group", { name: "Editor mode" })
    try {
      await modeBar.waitFor({ timeout: 15_000 })
      log("[info] ModeBar found")
    } catch {
      log("[error] ModeBar (role=group, aria-label='Editor mode') not found — taking fallback screenshot")
      await page.screenshot({
        path: path.join(OUT_DIR, "fallback-no-modebar.png"),
        fullPage: true,
      })
      exitCode = 1
      return
    }

    const buttons = await modeBar.getByRole("button").all()
    log(`[info] found ${buttons.length} view-toggle button(s) in ModeBar`)

    if (buttons.length === 0) {
      log("[error] no buttons found in ModeBar")
      exitCode = 1
      return
    }

    for (const button of buttons) {
      let name = "(unknown)"
      try {
        name = (await button.getAttribute("aria-label")) ?? (await button.innerText()) ?? "(unknown)"
        name = name.trim()
        const filename = name.toLowerCase().replace(/\s+/g, "-") + ".png"
        log(`[info] clicking button "${name}"…`)
        await button.click({ timeout: 10_000 })

        // Wait for the view to actually settle — a fixed timeout is unreliable
        // because the dev server cold-compiles the target view's subtree on
        // first switch. The ModeBar label maps 1:1 to `.rt-canvas[data-rt-view]`
        // ("Canvas" → "canvas"); wait for that attribute to match before
        // screenshotting so we never capture a mid-transition frame.
        const expectedView = name.toLowerCase()
        try {
          await page.waitForFunction(
            (v) => document.querySelector(".rt-canvas")?.getAttribute("data-rt-view") === v,
            expectedView,
            { timeout: 15_000 },
          )
        } catch {
          log(`[warn] "${name}" view did not settle to data-rt-view="${expectedView}" within 15s`)
          exitCode = 1
        }
        // small settle for layout/paint after the attribute flips
        await page.waitForTimeout(500)

        const screenshotPath = path.join(OUT_DIR, filename)
        await page.screenshot({ path: screenshotPath, fullPage: true })
        log(`[info] screenshot saved: ${screenshotPath}`)
      } catch (err) {
        log(`[error] failed while processing button "${name}": ${err.message}`)
        exitCode = 1
      }
    }
    // -----------------------------------------------------------------------
    // 4. Exercise ThemeBar controls to surface any runtime crashes
    // -----------------------------------------------------------------------
    // Ensure we're in canvas view (the view loop may have ended on a different
    // view). Click the "Canvas" ModeBar button explicitly before opening controls.
    let canvasSwitchOk = false
    try {
      const canvasBtn = page.getByRole("button", { name: /^canvas$/i })
      await canvasBtn.click({ timeout: 10_000 })
      await page.waitForFunction(
        () => document.querySelector(".rt-canvas")?.getAttribute("data-rt-view") === "canvas",
        { timeout: 15_000 },
      )
      await page.waitForTimeout(300)
      canvasSwitchOk = true
    } catch {
      log("[warn] could not switch back to canvas view before ThemeBar exercise — skipping ThemeBar controls")
      exitCode = 1
    }

    // ThemeBar segments are now ToggleGroupItems (role="radio") inside a
    // Popover-anchored ToggleGroup. Labels updated to match the new shell's
    // aria-label values ("Corner radius" replaces the old "Corner radius and
    // border style"). getByRole("radio") matches Radix ToggleGroupItem[type=single].
    const themeBarControls = [
      "Colour palette",
      "Font pairings",
      "Corner radius",
    ]

    if (canvasSwitchOk) {
      for (const label of themeBarControls) {
        try {
          const btn = page.getByRole("radio", { name: label })
          await btn.waitFor({ timeout: 10_000 })
          log(`[info] opening ThemeBar control "${label}"…`)
          // First click: open the Popover panel
          await btn.click({ timeout: 10_000 })
          await page.waitForTimeout(600)
          // Second click: toggle-close the Popover (same button toggles off)
          await btn.click({ timeout: 10_000 })
          await page.waitForTimeout(200)
          log(`[info] opened ThemeBar control "${label}"`)
        } catch (err) {
          log(`[error] failed while exercising ThemeBar control "${label}": ${err.message}`)
          exitCode = 1
        }
      }
    }
  } catch (err) {
    log(`[error] unexpected error: ${err.message}`)
    if (err.stack) log(`[error-stack] ${err.stack}`)
    exitCode = 1
  } finally {
    await browser.close()
    log(`[info] browser closed — ${new Date().toISOString()}`)
    flushConsoleLog()
  }
}

main().then(() => {
  process.exit(exitCode)
}).catch((err) => {
  log(`[fatal] ${err.message}`)
  flushConsoleLog()
  process.exit(1)
})
