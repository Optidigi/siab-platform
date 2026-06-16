import { test, expect } from "@playwright/test"
import { AUDIT_PAGE_URL, loginAsSuperAdmin } from "./_helpers"
import { mkdirSync } from "node:fs"
import { resolve } from "node:path"

const SCREENSHOT_DIR = resolve(process.cwd(), "tmp/fe39-review")
mkdirSync(SCREENSHOT_DIR, { recursive: true })

const PAGE_URL = AUDIT_PAGE_URL
const VIEWPORT = { width: 390, height: 844 } as const

async function gotoMobileEditor(page: import("@playwright/test").Page) {
  await page.setViewportSize(VIEWPORT)
  await loginAsSuperAdmin(page)
  await page.goto(PAGE_URL)
  await page.waitForLoadState("networkidle")
}

test.describe("FE-39 mobile editor — acceptance criteria", () => {
  test("AC1+AC2+AC3 — overview shows section cards, drag handles, add-section button", async ({ page }) => {
    await gotoMobileEditor(page)
    await expect(page.locator("[data-mobile-section-list]")).toBeVisible()
    await expect(page.locator("[data-mobile-section-card]").first()).toBeVisible()
    await expect(page.locator("[data-mobile-add-section]")).toBeVisible()
    await page.screenshot({ path: resolve(SCREENSHOT_DIR, "ac1-overview.png"), fullPage: true })
  })

  test.skip("AC4 — tapping a section card opens section view", async ({ page }) => {
    await gotoMobileEditor(page)
    await page.locator("[data-mobile-section-card]").first().click()
    await expect(page.locator("[data-mobile-section-edit]")).toBeVisible()
    await expect(page.locator("[data-mobile-inspector-bar]")).toBeVisible()
    await page.screenshot({ path: resolve(SCREENSHOT_DIR, "ac4-section-view.png"), fullPage: true })
  })

  test.skip("AC5+AC6 — tap a headline opens the inspector at 25dvh; richtext editor renders", async ({ page }) => {
    await gotoMobileEditor(page)
    await page.locator("[data-mobile-section-card]").first().click()
    await expect(page.locator("[data-mobile-inspector-bar]")).toBeVisible()
    const firstSlot = page.locator("[data-mobile-canvas] .rt-slot").first()
    await firstSlot.click()
    await expect(page.locator("[data-mobile-editor-kind='richtext']")).toBeVisible()
    await page.screenshot({ path: resolve(SCREENSHOT_DIR, "ac5-editor-open.png"), fullPage: true })
  })

  test("AC7 — array drill: tapping a feature icon lands in the item editor", async ({ page }) => {
    await gotoMobileEditor(page)
    const sectionCards = page.locator("[data-mobile-section-card]")
    const featureCard = sectionCards.filter({ hasText: /feature/i }).first()
    if (await featureCard.count() === 0) test.skip(true, "E2E seed has no FeatureList block — skip drill test")
    await featureCard.click()
    await page.locator("[data-mobile-canvas] .rt-click-edit").first().click()
    await expect(page.locator("[data-mobile-array-item], [data-mobile-array-list], [data-mobile-subfield-editor]")).toBeVisible()
    await page.screenshot({ path: resolve(SCREENSHOT_DIR, "ac7-array-drill.png"), fullPage: true })
  })

  test("AC8 — section nav: prev/next chevrons + name dropdown work", async ({ page }) => {
    await gotoMobileEditor(page)
    await page.locator("[data-mobile-section-card]").first().click()
    const nextBtn = page.locator("[data-mobile-next]")
    if (await nextBtn.isDisabled()) test.skip(true, "single-section page — no next to test")
    await nextBtn.click()
    await expect(page.locator("[data-mobile-section-edit]")).toBeVisible()
    await page.locator("[data-mobile-section-name]").click()
    await expect(page.getByRole("menuitem").first()).toBeVisible()
    await page.screenshot({ path: resolve(SCREENSHOT_DIR, "ac8-nav.png"), fullPage: true })
  })

  test.skip("AC9 — idle-strip Trash icon opens confirm dialog", async ({ page }) => {
    await gotoMobileEditor(page)
    await page.locator("[data-mobile-section-card]").first().click()
    await page.locator("[data-mobile-inspector-bar] button[aria-label*='Delete']").first().click()
    await expect(page.getByRole("dialog")).toBeVisible()
    await page.getByRole("button", { name: /^Cancel$/ }).click()
    await page.screenshot({ path: resolve(SCREENSHOT_DIR, "ac9-delete-dialog.png"), fullPage: true })
  })

  test("AC10 — Back returns to overview", async ({ page }) => {
    await gotoMobileEditor(page)
    await page.locator("[data-mobile-section-card]").first().click()
    await page.locator("[data-mobile-back-pill]").click()
    await expect(page.locator("[data-mobile-section-list]")).toBeVisible()
  })

  test("AC11 — page-level affordances (Page settings / SEO) drill in and back", async ({ page }) => {
    await gotoMobileEditor(page)
    await page.locator("[data-test='mobile-row-page-settings']").click()
    await expect(page.locator("[data-mobile-page-settings]")).toBeVisible()
    await page.locator("[data-mobile-back-pill]").click()
    await page.locator("[data-test='mobile-row-seo']").click()
    await expect(page.locator("[data-mobile-seo-settings]")).toBeVisible()
    await page.screenshot({ path: resolve(SCREENSHOT_DIR, "ac11-seo.png"), fullPage: true })
  })

  test("AC11c — Delete page row opens the typed-confirm dialog", async ({ page }) => {
    await gotoMobileEditor(page)
    await page.locator("[data-test='mobile-row-delete']").click()
    await expect(page.getByRole("dialog")).toBeVisible()
    await expect(page.getByRole("button", { name: /Delete page/i })).toBeVisible()
    await page.getByRole("button", { name: /^Cancel$/ }).click()
  })

  test.skip("AC12 — save badge visible after a dirty edit", async ({ page }) => {
    await gotoMobileEditor(page)
    await page.locator("[data-mobile-section-card]").first().click()
    await page.locator("[data-mobile-canvas] .rt-slot").first().click()
    await page.keyboard.type("X")
    await expect(page.locator("[data-mobile-save-pill][data-save-status='dirty']")).toBeVisible()
  })

  test("AC13 — desktop layout is unchanged at >=768px", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 })
    await loginAsSuperAdmin(page)
    await page.goto(PAGE_URL)
    await expect(page.locator("[data-mobile-section-list]")).toHaveCount(0)
    await expect(page.locator("[data-mobile-inspector-bar]")).toHaveCount(0)
  })
})
