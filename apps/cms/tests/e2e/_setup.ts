import { expect, type APIRequestContext, type Page } from "@playwright/test"
import { cleanupTenant, readE2ESeed } from "./_seed"

export async function ensureE2EUser(ctx?: APIRequestContext) {
  void ctx
  const seed = readE2ESeed()
  return seed.superAdmin
}

export async function cleanupE2ETenant(slug: string, ctx?: APIRequestContext) {
  void ctx
  await cleanupTenant(slug)
}

export async function fillGhostedPasswordLogin(page: Page, email: string, password: string) {
  await page.waitForLoadState("networkidle")
  await page.locator('input[type="email"]').fill(email)

  const passwordInput = page.locator('input[type="password"]')
  if (await passwordInput.count() === 0) {
    await page.getByRole("button", { name: /password|wachtwoord/i }).click()
  }

  await expect(passwordInput).toBeVisible()
  await passwordInput.fill(password)
  await page.getByRole("button", { name: /^(sign in|inloggen)$/i }).click()
}

export async function loginAsE2ESuperAdmin(page: Page) {
  const creds = await ensureE2EUser()
  await page.goto("/login")
  await fillGhostedPasswordLogin(page, creds.email, creds.password)
  await expect(page).toHaveURL("/", { timeout: 20_000 })
}
