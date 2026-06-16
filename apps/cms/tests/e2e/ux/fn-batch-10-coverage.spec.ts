import { test, expect } from "@playwright/test"
import { AUDIT_SECONDARY_PAGE_URL, AUDIT_SETTINGS_URL, loginAsSuperAdmin } from "./_helpers"

/**
 * fn-batch-10 — operator-flagged manual-test findings.
 *
 * FN-2026-0062 — MediaPicker eager-normalize bug. Pre-fix a useEffect
 * in MediaPicker.tsx called `onChange(value.id)` on mount whenever the
 * form was passed a populated Media object, which (a) flipped the
 * form's isDirty=true on render with no user input, and (b) replaced
 * the form value with a bare id while the picker's items grid was
 * empty — so the display lookup `items.find(m => m.id === id)` returned
 * undefined and the image visually disappeared on save.
 *
 * FN-2026-0063 — Settings logo field removed. Whitelabel feature out
 * of scope per operator; schema field remains for backwards compat.
 */

test.describe("fn-batch-10 — operator-flagged fixes", () => {
  test("FN-2026-0062 — page editor with existing OG image is CLEAN on mount (no spurious dirty)", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await loginAsSuperAdmin(page)
    await page.goto(AUDIT_SECONDARY_PAGE_URL)
    await page.waitForLoadState("networkidle")
    // Wait for any deferred effects to settle
    await page.waitForTimeout(1000)
    const dirtyBadge = page.locator('[data-slot="badge"]').filter({ hasText: /unsaved/i })
    expect(
      await dirtyBadge.count(),
      "Form must be CLEAN on mount — pre-fix MediaPicker eager-normalize dirtied it"
    ).toBe(0)
  })

  test("FN-2026-0063 — Settings page keeps Brand logo fields and hides bloated business fields", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await loginAsSuperAdmin(page)
    await page.goto(AUDIT_SETTINGS_URL)
    await page.waitForLoadState("networkidle")
    await page.getByRole("button", { name: /brand/i }).click()
    const body = (await page.locator("body").innerText()) ?? ""
    expect(body).toMatch(/logo/i)
    expect(body).toMatch(/favicon/i)
    expect(body, "Logo field should stay in Brand settings").toMatch(/logo/i)
    expect(body, "Favicon field should stay in Brand settings").toMatch(/favicon/i)
    expect(body, "Business identifiers should stay out of client-facing settings").not.toMatch(/kvk|opening hours/i)
  })
})
