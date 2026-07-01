import { test, expect } from "@playwright/test"
import { ensureE2EUser, fillGhostedPasswordLogin } from "./_setup"

test("/login is reachable; bad credentials show error", async ({ page }) => {
  await ensureE2EUser()
  await page.goto("/login")
  await fillGhostedPasswordLogin(page, "e2e-sa@test.local", "WRONG_PASSWORD")
  // Status feedback appears on failed login.
  await expect(page.getByText(/Invalid email or password/i)).toBeVisible({ timeout: 10_000 })
})

test("authenticated routes redirect to /login when unauthenticated", async ({ page }) => {
  // No login. Visit a protected route.
  const res = await page.goto("/sites")
  // Either we end up at /login (redirect followed) or page renders the login form.
  await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
})
