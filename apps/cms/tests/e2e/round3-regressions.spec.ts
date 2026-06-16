import { test, expect, type Page } from "@playwright/test"
import { loginLocal, AMI_PAGE, LOCAL_BASE } from "./_local"

type EditorMode = "canvas" | "sidebar"

async function openLocalEditorPage(page: Page) {
  await loginLocal(page)
  await page.goto(`${LOCAL_BASE}${AMI_PAGE}`, { waitUntil: "networkidle" })
  await expect(page.locator(".rt-canvas").first()).toBeVisible({ timeout: 30_000 })
}

async function ensureEditorMode(page: Page, mode: EditorMode) {
  const canvas = page.locator(".rt-canvas").first()
  await expect(canvas).toBeVisible({ timeout: 30_000 })

  const currentView = await canvas.getAttribute("data-rt-view")
  if (currentView === mode) return

  const modeGroup = page.getByRole("group", { name: "Editor view" })
  await expect(modeGroup).toBeVisible({ timeout: 10_000 })
  await modeGroup.getByRole("button", { name: new RegExp(`${mode} view`, "i") }).click({ force: true })
  await page.waitForFunction(
    (nextMode) => document.querySelector(".rt-canvas")?.getAttribute("data-rt-view") === nextMode,
    mode,
    { timeout: 20_000, polling: 200 },
  )
}

test.describe("Round 3 — root-cause regressions", () => {
  test.beforeEach(async ({ page }) => {
    await openLocalEditorPage(page)
    await ensureEditorMode(page, "canvas")
  })

  test("Bug #1/#2/#8 — inspector switches elements without crash or stale content", async ({ page }) => {
    const pageErrors: string[] = []
    page.on("pageerror", (err) => pageErrors.push(err.message))

    await ensureEditorMode(page, "sidebar")

    const blockRows = page.locator("aside [role='button'][tabindex='0']")
    await expect(blockRows.first()).toBeVisible({ timeout: 10_000 })
    const rowCount = await blockRows.count()
    test.skip(rowCount < 2, "local AMI page needs at least two blocks for the switch-elements regression")

    await blockRows.nth(0).click()
    await expect(page.getByRole("button", { name: /back to block list/i })).toBeVisible({ timeout: 10_000 })

    await page.getByRole("button", { name: /back to block list/i }).click()
    await expect(blockRows.nth(1)).toBeVisible({ timeout: 10_000 })
    await blockRows.nth(1).click()
    await page.waitForTimeout(300)

    // The page must not have crashed
    expect(pageErrors).toEqual([])
    // The Next.js dev-error overlay must not be visible
    await expect(page.getByRole("dialog", { name: /runtime error/i })).toHaveCount(0)
  })

  test("Bug #7 — no React hydration warning on initial editor load", async ({ page }) => {
    // Ensure the page is in sidebar mode (SidebarDrillDown mounts the DndContext whose
    // auto-generated id differs between SSR and CSR when the server counter > 0).
    // Step 1: load once, switch to sidebar (persists to DB via server action), warm
    //         the server-side module counter with a few extra SSR requests.
    await ensureEditorMode(page, "sidebar")
    // Give the setUserEditorMode server action time to commit so the next SSR
    // request returns sidebar mode from the DB.
    await page.waitForTimeout(1_500)

    // Warm the server's @dnd-kit/utilities module counter by making additional SSR
    // requests. Each request increments `ids["DndDescribedBy"]` on the server; the
    // client always starts at 0 — triggering the mismatch within a few reloads.
    for (let i = 0; i < 3; i++) {
      await page.reload({ waitUntil: "networkidle" })
      await page.waitForTimeout(300)
    }

    // Step 2: final reload — capture console errors during SSR + hydration.
    const consoleErrors: string[] = []
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text())
    })
    await page.reload({ waitUntil: "networkidle" })
    await page.waitForTimeout(1_000) // let hydration settle

    const hydrationErrors = consoleErrors.filter((e) =>
      /hydrat|server rendered HTML/i.test(e),
    )
    expect(hydrationErrors).toEqual([])
  })

  test("Bug #6 — BlockGutter drag handle and actions menu are reachable in canvas view", async ({ page }) => {
    const pageErrors: string[] = []
    page.on("pageerror", (err) => pageErrors.push(err.message))

    await ensureEditorMode(page, "canvas")

    // Locate the first block on the canvas
    const firstBlock = page.locator("[data-block-index='0']").first()
    await expect(firstBlock).toBeVisible({ timeout: 10_000 })

    // Hover over it to reveal the gutter
    await firstBlock.hover()

    // Drag handle must be visible on hover
    const dragHandle = page.getByRole("button", { name: "Drag to reorder" }).first()
    await expect(dragHandle).toBeVisible({ timeout: 3000 })

    // Block actions trigger must be visible on hover
    const actionsBtn = page.getByRole("button", { name: "Block actions" }).first()
    await expect(actionsBtn).toBeVisible({ timeout: 3000 })

    // Click actions button and assert the menu opens with a Delete item
    await actionsBtn.click()
    await expect(page.getByRole("menuitem", { name: "Delete" })).toBeVisible({ timeout: 3000 })

    expect(pageErrors).toEqual([])
  })

  test("Bug #4 — clicking into a canvas richtext slot does NOT mark form dirty", async ({ page }) => {
    const pageErrors: string[] = []
    page.on("pageerror", (err) => pageErrors.push(err.message))

    await ensureEditorMode(page, "canvas")

    // Save button is disabled initially (form is clean)
    const saveBtn = page.getByRole("button", { name: /^save$/i })
    await expect(saveBtn).toBeDisabled()

    // Click into the hero headline richtext slot — do not type
    const headline = page.locator(".rt-canvas").getByText(/jeugdzorg/i).first()
    await headline.click()
    await page.waitForTimeout(800) // allow time for any RHF onChange propagation and re-render

    // Save button must still be disabled — clicking without typing must NOT mark form dirty
    await expect(saveBtn).toBeDisabled()
    expect(pageErrors).toEqual([])
  })
})
