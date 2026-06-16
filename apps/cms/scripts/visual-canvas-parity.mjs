#!/usr/bin/env node
/**
 * Visual parity audit for the Amicare CMS canvas.
 *
 * Prerequisites:
 * - Payload dev server on http://localhost:3000
 * - site-amicare-zorg dev server on http://localhost:4321
 * - local seed account from scripts/seed-super-admin.ts
 *
 * The audit screenshots the CMS tenant frame in sidebar/read-only mode and the
 * live Astro site at the same effective frame width. It writes pairs, montages,
 * and ImageMagick diffs to tmp/canvas-parity/.
 */

import fs from "node:fs"
import path from "node:path"
import { execFileSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import { chromium } from "@playwright/test"

const CMS_BASE = "http://localhost:3000"
const SITE_BASE = "http://localhost:4321"
const LOCAL_EMAIL = "admin@local.test"
const LOCAL_PASSWORD = "LocalTest!1234"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.resolve(__dirname, "..", "tmp", "canvas-parity")
fs.mkdirSync(OUT_DIR, { recursive: true })

const widths = [
  { name: "desktop", width: 1440, height: 1400 },
  { name: "tablet", width: 1080, height: 1400 },
  { name: "narrow", width: 820, height: 1400 },
]

const targets = [
  { name: "frame", canvas: ".rt-canvas .site-frame-root", site: ".site-frame-root" },
  { name: "header", canvas: ".rt-canvas nav[aria-label='Hoofdnavigatie']", site: "nav[aria-label='Hoofdnavigatie']" },
  { name: "hero", canvas: ".rt-canvas .cms-block--hero", site: ".cms-block--hero" },
  { name: "feature-list", canvas: ".rt-canvas .cms-block--featurelist", site: ".cms-block--featurelist" },
  { name: "testimonials", canvas: ".rt-canvas .cms-block--testimonials", site: ".cms-block--testimonials" },
  { name: "faq", canvas: ".rt-canvas .cms-block--faq", site: ".cms-block--faq" },
  { name: "cta", canvas: ".rt-canvas .cms-block--cta", site: ".cms-block--cta" },
  { name: "contact", canvas: ".rt-canvas .cms-block--contact", site: ".cms-block--contact" },
  { name: "footer", canvas: ".rt-canvas footer", site: "footer" },
]

const logLines = []

function log(line) {
  console.log(line)
  logLines.push(line)
}

function writeLog() {
  fs.writeFileSync(path.join(OUT_DIR, "report.txt"), logLines.join("\n") + "\n", "utf8")
}

async function probe(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(20_000) })
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`)
}

async function loginLocal(page) {
  await page.goto(`${CMS_BASE}/login`, { timeout: 30_000, waitUntil: "networkidle" })
  await page.getByLabel(/email/i).fill(LOCAL_EMAIL)
  await page.getByLabel(/password/i).fill(LOCAL_PASSWORD)
  await Promise.all([
    page.waitForURL(/\/(sites|$)/, { timeout: 30_000 }),
    page.getByRole("button", { name: /sign in/i }).click(),
  ])
}

async function openAmicareEditor(page) {
  await page.goto(`${CMS_BASE}/sites/amicare-zorg/pages`, { timeout: 45_000, waitUntil: "networkidle" })
  const editLink = page.locator('a[href^="/sites/amicare-zorg/pages/"]:not([href$="/new"])').first()
  await editLink.waitFor({ state: "attached", timeout: 20_000 })
  const href = await editLink.getAttribute("href")
  if (!href) throw new Error("Amicare page edit link has no href")
  await page.goto(`${CMS_BASE}${href}`, { timeout: 45_000, waitUntil: "networkidle" })
}

async function ensureEditorMode(page, mode) {
  await page.locator(".rt-canvas").first().waitFor({ timeout: 30_000 })
  const current = await page.locator(".rt-canvas").first().getAttribute("data-rt-view")
  if (current === mode) return

  const group = page.getByRole("group", { name: /editor view|editor mode/i })
  await group.waitFor({ timeout: 15_000 })
  await group.getByRole("button", { name: new RegExp(`${mode} view|^${mode}$`, "i") }).click({ force: true })
  await page.waitForFunction(
    (expectedMode) => document.querySelector(".rt-canvas")?.getAttribute("data-rt-view") === expectedMode,
    mode,
    { timeout: 20_000 },
  )
}

async function quietCanvasAffordances(page) {
  await page.addStyleTag({
    content: `
      .rt-canvas *,
      .rt-canvas *::before,
      .rt-canvas *::after {
        animation: none !important;
        transition: none !important;
      }
      .rt-canvas [data-rt-selected],
      .rt-canvas .rt-slot,
      .rt-canvas .rt-click-edit,
      .rt-canvas [data-inline-editable],
      .rt-canvas [data-active] {
        outline: 0 !important;
        box-shadow: none !important;
      }
      .rt-canvas .group\\/gap {
        display: none !important;
      }
    `,
  })
}

async function quietSiteMotion(page) {
  await page.addStyleTag({
    content: `
      *,
      *::before,
      *::after {
        animation: none !important;
        transition: none !important;
      }
    `,
  })
}

async function screenshotIfPresent(page, selector, filePath) {
  const locator = page.locator(selector).first()
  const count = await locator.count()
  if (!count) return { status: "missing" }
  if (selector.includes("nav[aria-label")) await page.evaluate(() => window.scrollTo(0, 0))
  await locator.scrollIntoViewIfNeeded({ timeout: 10_000 })
  await page.waitForTimeout(250)
  await locator.screenshot({ path: filePath, animations: "disabled", timeout: 20_000 })
  const box = await locator.boundingBox()
  return { status: "ok", box }
}

function imageSize(filePath) {
  const output = execFileSync("magick", ["identify", "-format", "%w %h", filePath], { encoding: "utf8" }).trim()
  const [width, height] = output.split(/\s+/).map(Number)
  return { width, height }
}

function comparePair(canvasPath, sitePath, diffPath, montagePath) {
  const canvasSize = imageSize(canvasPath)
  const siteSize = imageSize(sitePath)

  execFileSync("magick", [
    canvasPath,
    sitePath,
    "+append",
    montagePath,
  ])

  if (canvasSize.width !== siteSize.width || canvasSize.height !== siteSize.height) {
    return { compared: false, canvasSize, siteSize, reason: "dimension mismatch" }
  }

  let metric = "0"
  try {
    execFileSync("magick", [
      "compare",
      "-metric",
      "RMSE",
      canvasPath,
      sitePath,
      diffPath,
    ], { encoding: "utf8", stdio: ["ignore", "ignore", "pipe"] })
  } catch (err) {
    metric = String(err.stderr || "").trim()
  }
  return { compared: true, canvasSize, siteSize, metric }
}

async function main() {
  log(`[info] visual-canvas-parity starting - ${new Date().toISOString()}`)
  log(`[info] output: ${OUT_DIR}`)

  await probe(`${CMS_BASE}/login`)
  await probe(SITE_BASE)

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: widths[0] })
  const cms = await context.newPage()
  const site = await context.newPage()

  cms.on("pageerror", (err) => log(`[cms pageerror] ${err.message}`))
  site.on("pageerror", (err) => log(`[site pageerror] ${err.message}`))

  try {
    await loginLocal(cms)

    for (const size of widths) {
      log(`\n[case] ${size.name} admin viewport ${size.width}x${size.height}`)
      await cms.setViewportSize({ width: size.width, height: size.height })
      await openAmicareEditor(cms)
      await ensureEditorMode(cms, "canvas")
      await quietCanvasAffordances(cms)
      await cms.locator(".rt-canvas .site-frame-root").first().waitFor({ timeout: 30_000 })

      const frameBox = await cms.locator(".rt-canvas").first().boundingBox()
      const frameWidth = Math.max(320, Math.round(frameBox?.width ?? size.width))
      log(`[info] effective canvas width: ${frameWidth}px`)

      await site.setViewportSize({ width: frameWidth, height: size.height })
      await site.goto(SITE_BASE, { timeout: 45_000, waitUntil: "networkidle" })
      await quietSiteMotion(site)
      await site.locator(".site-frame-root").first().waitFor({ timeout: 30_000 })

      for (const target of targets) {
        const prefix = `${size.name}-${target.name}`
        const canvasPath = path.join(OUT_DIR, `${prefix}-canvas.png`)
        const sitePath = path.join(OUT_DIR, `${prefix}-site.png`)
        const diffPath = path.join(OUT_DIR, `${prefix}-diff.png`)
        const montagePath = path.join(OUT_DIR, `${prefix}-montage.png`)

        const canvasShot = await screenshotIfPresent(cms, target.canvas, canvasPath)
        const siteShot = await screenshotIfPresent(site, target.site, sitePath)
        if (canvasShot.status !== "ok" || siteShot.status !== "ok") {
          log(`[${prefix}] missing canvas=${canvasShot.status} site=${siteShot.status}`)
          continue
        }

        const result = comparePair(canvasPath, sitePath, diffPath, montagePath)
        if (!result.compared) {
          log(`[${prefix}] ${result.reason}: canvas ${result.canvasSize.width}x${result.canvasSize.height}, site ${result.siteSize.width}x${result.siteSize.height}`)
        } else {
          log(`[${prefix}] RMSE ${result.metric}`)
        }
      }
    }
  } finally {
    await browser.close()
    writeLog()
  }
}

main().catch((err) => {
  log(`[error] ${err.stack || err.message}`)
  writeLog()
  process.exit(1)
})
