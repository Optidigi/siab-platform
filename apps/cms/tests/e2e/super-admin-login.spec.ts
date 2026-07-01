import { test, expect } from "@playwright/test"
import { loginAsE2ESuperAdmin } from "./_setup"

test("super-admin login + dashboard renders", async ({ page }) => {
  await loginAsE2ESuperAdmin(page)
  // Stat card labels from Phase 7's dashboard
  await expect(page.getByText(/Total tenants|Published pages/i).first()).toBeVisible({ timeout: 15_000 })
})
