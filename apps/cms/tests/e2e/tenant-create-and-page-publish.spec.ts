import { test, expect } from "@playwright/test"
import { ensureE2EUser, cleanupE2ETenant } from "./_setup"

test("super-admin: create tenant + publish page", async ({ page }) => {
  const slug = `e2e-${Date.now()}`
  await cleanupE2ETenant(slug)
  const creds = await ensureE2EUser()

  await page.goto("/login")
  await page.waitForLoadState("networkidle")
  await page.fill('input[type="email"]', creds.email)
  await page.fill('input[type="password"]', creds.password)
  await page.getByRole("button", { name: /sign in/i }).click()
  await expect(page).toHaveURL("/", { timeout: 20_000 })

  // Create site
  await page.goto("/sites")
  await page.waitForLoadState("networkidle")
  await page.getByRole("button", { name: /new site/i }).click()
  await expect(page.getByRole("dialog", { name: /new site/i })).toBeVisible({ timeout: 10_000 })
  await page.fill('input[name="name"]', "E2E Tenant")
  await page.fill('input[name="slug"]', slug)
  await page.fill('input[name="domain"]', `${slug}.test`)
  await page.getByRole("button", { name: /create site/i }).click()
  // Either lands on /sites/<slug>/onboarding or shows status feedback.
  await expect(page).toHaveURL(/\/sites\/[^/]+\/onboarding$/, { timeout: 20_000 })
  const createdSlug = new URL(page.url()).pathname.split("/")[2] ?? slug

  // Create + publish a page
  await page.goto(`/sites/${createdSlug}/pages/new`)
  await page.fill('input[name="title"]', "E2E Home")
  await page.fill('input[name="slug"]', "home")

  // Set status to Published
  // The Status Select trigger from Phase 9's PageForm (radix Select)
  await page.locator('button[role="combobox"]').first().click()
  await page.getByRole('option', { name: 'Published' }).click()

  await page.click('button:has-text("Save")')

  // After save, should redirect to /sites/<slug>/pages/<id>
  await expect(page).toHaveURL(new RegExp(`/sites/${createdSlug}/pages/\\d+`), { timeout: 20_000 })
  await expect(page.getByText("Published").first()).toBeVisible({ timeout: 10_000 })

  // Cleanup
  await cleanupE2ETenant(createdSlug)
})
