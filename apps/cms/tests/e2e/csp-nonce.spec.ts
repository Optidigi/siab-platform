import { test, expect } from "@playwright/test"

test("admin loads under strict CSP — no inline script errors", async ({ page }) => {
  const errors: string[] = []
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`))
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`console: ${msg.text()}`)
  })

  await page.goto("/login")
  await expect(page.getByLabel("Email")).toBeVisible()

  // Filter only CSP-relevant errors
  const cspErrors = errors.filter((e) => /content security policy|refused to execute/i.test(e))
  expect(cspErrors).toEqual([])
})
