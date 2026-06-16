import { test, expect } from "@playwright/test"
import {
  ADMIN_ROUTES_AUTHENTICATED,
  ADMIN_ROUTES_UNAUTHENTICATED,
  AUDIT_PAGE_URL,
  AUDIT_SITE_NAME,
  AUDIT_SITE_URL,
  loginAsSuperAdmin
} from "./_helpers"

/**
 * UX-2026-0001 (U12) — document.title must be non-empty on every walked admin
 * route. axe-core 4.10.2 reports `document-title` (impact: serious) when
 * <title> is missing or empty (WCAG 2.4.2 Level A).
 *
 * Acceptance: title is non-empty AND contains the brand "SiteInABox" so users
 * can recognise the tab in a multi-tab browser. Per-route specifics
 * ("Page · Tenant · SiteInABox" pattern) are checked in spot assertions
 * below the sweep — sweep is the floor; spot assertions guard the pattern.
 */

test.describe("UX-2026-0001 — document.title metadata", () => {
  test("every unauthenticated route carries a non-empty title", async ({ page }) => {
    for (const route of ADMIN_ROUTES_UNAUTHENTICATED) {
      await page.goto(route.url)
      const title = await page.title()
      expect.soft(title, `${route.label} (${route.url})`).not.toBe("")
      expect.soft(title, `${route.label} (${route.url})`).toContain("SiteInABox")
    }
  })

  test("every authenticated admin route carries a non-empty title", async ({ page }) => {
    test.setTimeout(120_000)
    await loginAsSuperAdmin(page)
    for (const route of ADMIN_ROUTES_AUTHENTICATED) {
      await page.goto(route.url, { waitUntil: "domcontentloaded", timeout: 30_000 })
      const title = await page.title()
      expect.soft(title, `${route.label} (${route.url})`).not.toBe("")
      expect.soft(title, `${route.label} (${route.url})`).toContain("SiteInABox")
    }
  })

  test("page editor title includes the page and tenant name", async ({ page }) => {
    await loginAsSuperAdmin(page)
    await page.goto(AUDIT_PAGE_URL)
    const title = await page.title()
    // Pattern: "<Page> · <Tenant> · SiteInABox"
    expect(title).toContain("Home")
    expect(title).toContain(AUDIT_SITE_NAME)
    expect(title).toContain("SiteInABox")
  })

  test("tenant dashboard title includes the tenant name", async ({ page }) => {
    await loginAsSuperAdmin(page)
    await page.goto(AUDIT_SITE_URL)
    const title = await page.title()
    expect(title).toContain(AUDIT_SITE_NAME)
    expect(title).toContain("SiteInABox")
  })
})
