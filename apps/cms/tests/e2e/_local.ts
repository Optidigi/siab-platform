/**
 * Local dev-pipeline helpers for Playwright audit scripts.
 *
 * Targets the configured Playwright CMS base with the standard E2E seed.
 *
 * Kept for older regression specs that still import the local helper names.
 */

import type { Page } from "@playwright/test"
import { readE2ESeed } from "./_seed"

const seed = readE2ESeed()
export const LOCAL_BASE = process.env.E2E_BASE_URL || "http://localhost:3001"
export const AMI_PAGE = seed.audit.pageUrl

const LOCAL_EMAIL = seed.localAdmin.email
const LOCAL_PASSWORD = seed.localAdmin.password

/**
 * Log in to the local CMS instance.
 * Navigates to the login page, fills credentials, submits, and waits for
 * the post-login redirect. Generous timeouts because the dev server can take
 * 10-15 s to compile the login route on first hit.
 */
export async function loginLocal(page: Page): Promise<void> {
  await page.goto(`${LOCAL_BASE}/login`, { timeout: 30_000, waitUntil: "networkidle" })

  await page.getByLabel(/email/i).fill(LOCAL_EMAIL)
  await page.getByLabel(/password/i).fill(LOCAL_PASSWORD)

  await Promise.all([
    page.waitForURL(/\/(sites|$)/, { timeout: 30_000 }),
    page.getByRole("button", { name: /sign in/i }).click(),
  ])
}
