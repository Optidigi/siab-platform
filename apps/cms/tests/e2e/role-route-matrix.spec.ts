import { expect, test, type Page } from "@playwright/test"
import { readE2ESeed } from "./_seed"

const seed = readE2ESeed()
const password = "e2e-test-1234"

function tenantBaseUrl() {
  if (process.env.E2E_TENANT_BASE_URL) return process.env.E2E_TENANT_BASE_URL.replace(/\/$/, "")

  const base = new URL(process.env.E2E_BASE_URL || "http://localhost:3001")
  if (base.hostname !== "localhost" && base.hostname !== "127.0.0.1") {
    return null
  }

  return `${base.protocol}//${seed.audit.slug}.localhost${base.port ? `:${base.port}` : ""}`
}

function tenantUrl(pathname: string) {
  const base = tenantBaseUrl()
  if (!base) return null
  return `${base}${pathname}`
}

async function loginAsTenantRole(page: Page, role: "owner" | "editor" | "viewer") {
  const loginUrl = tenantUrl("/login")
  if (!loginUrl) {
    test.skip(true, "Tenant-host role matrix requires localhost or E2E_TENANT_BASE_URL")
    throw new Error("Skipped tenant-host role matrix")
  }

  await page.goto(loginUrl)
  await page.waitForLoadState("networkidle")
  await page.fill('input[type="email"]', `${role}.audit@test.local`)
  await page.fill('input[type="password"]', password)
  await page.getByRole("button", { name: /sign in/i }).click()
  await page.waitForURL((url) => url.origin === new URL(loginUrl).origin && url.pathname === "/", {
    timeout: 30_000,
  })
}

test.describe("OBS-103 tenant-host role route matrix", () => {
  test("owner can reach owner routes and sees owner navigation affordances", async ({ page }) => {
    await loginAsTenantRole(page, "owner")

    await page.goto(tenantUrl("/settings")!)
    await expect(page).toHaveURL(/\/settings$/)
    await expect(page.locator('aside a[href="/settings"]')).toHaveCount(1)
    await expect(page.locator('aside a[href="/users"]')).toHaveCount(1)
    await expect(page.locator('aside a[href="/navigation"]')).toHaveCount(1)
  })

  test("editor is blocked from owner routes and does not see owner navigation affordances", async ({ page }) => {
    await loginAsTenantRole(page, "editor")

    await page.goto(tenantUrl("/settings")!)
    await expect(page).toHaveURL(/\?error=forbidden/)

    await page.goto(tenantUrl("/")!)
    await expect(page.locator('aside a[href="/settings"]')).toHaveCount(0)
    await expect(page.locator('aside a[href="/users"]')).toHaveCount(0)
    await expect(page.locator('aside a[href="/navigation"]')).toHaveCount(0)
  })

  test("viewer can open an existing page but cannot create pages", async ({ page }) => {
    await loginAsTenantRole(page, "viewer")

    await page.goto(tenantUrl(`/pages/${seed.audit.pageId}`)!)
    await expect(page).toHaveURL(new RegExp(`/pages/${seed.audit.pageId}$`))
    await expect(page.getByRole("button", { name: /save/i })).toHaveCount(0)

    await page.goto(tenantUrl("/pages/new")!)
    await expect(page).toHaveURL(/\?error=forbidden/)
  })
})
