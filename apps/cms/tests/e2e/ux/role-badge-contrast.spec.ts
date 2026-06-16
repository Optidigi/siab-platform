import { test, expect } from "@playwright/test"
import { AUDIT_USERS_URL, loginAsSuperAdmin } from "./_helpers"
import { forceTheme, type ContrastSample } from "./_contrast"

/**
 * UX-2026-0017 (U12 / WCAG 1.4.3 Contrast (Minimum), Level AA) — every
 * <RoleBadge> across the admin must clear 4.5:1 against its composited bg
 * in BOTH light and dark themes. Uses canvas-based sRGB contrast computation
 * so the spec is self-contained (no axe-core fetch / public-asset dependency).
 *
 * The badge ships four role tones (super-admin / owner / editor / viewer);
 * each tone needs to be exercised on at least one walked surface. /users
 * shows all four (the four seeded users); /sites/<slug>/users shows three
 * (no super-admin in tenant team). Spec walks both surfaces in both themes.
 */

const ROLE_BADGE_SURFACES = [
  { url: "/users", label: "super-admin global users" },
  { url: AUDIT_USERS_URL, label: "site team page" }
] as const

const BADGE_SELECTOR = '[data-slot="badge"]'

async function measureVisibleRoleBadges(page: import("@playwright/test").Page): Promise<ContrastSample[]> {
  return page.evaluate((selector) => {
    function parseToSrgb(css: string): [number, number, number, number] {
      const c = document.createElement("canvas")
      c.width = 1
      c.height = 1
      const ctx = c.getContext("2d")!
      ctx.fillStyle = css
      ctx.fillRect(0, 0, 1, 1)
      const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data
      return [r! / 255, g! / 255, b! / 255, (a as number) / 255]
    }
    function relLum([r, g, b]: [number, number, number]): number {
      const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))
      return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
    }
    function ratio(fg: [number, number, number], bg: [number, number, number]): number {
      const L1 = relLum(fg)
      const L2 = relLum(bg)
      const [a, b] = L1 > L2 ? [L1, L2] : [L2, L1]
      return (a + 0.05) / (b + 0.05)
    }

    return Array.from(document.querySelectorAll<HTMLElement>(selector))
      .filter((el) => {
        const rect = el.getBoundingClientRect()
        return rect.width > 0 && rect.height > 0
      })
      .map((el) => {
        if (el.dataset.variant !== "default") {
          throw new Error(`Role badge "${el.textContent?.trim()}" should use registry default variant, got "${el.dataset.variant}"`)
        }
        const cs = getComputedStyle(el)
        const fgRaw = parseToSrgb(cs.color)
        const bgRaw = parseToSrgb(cs.backgroundColor)
        const fg: [number, number, number] = [fgRaw[0], fgRaw[1], fgRaw[2]]
        const bg: [number, number, number] = [bgRaw[0], bgRaw[1], bgRaw[2]]
        const r = ratio(fg, bg)
        return {
          selectorText: `${el.tagName.toLowerCase()} "${el.textContent?.trim().slice(0, 30) ?? ""}"`,
          ratio: Math.round(r * 100) / 100,
          threshold: 4.5,
        }
      })
  }, BADGE_SELECTOR)
}

test.describe("UX-2026-0017 — RoleBadge contrast across themes + role tones", () => {
  for (const surface of ROLE_BADGE_SURFACES) {
    for (const theme of ["light", "dark"] as const) {
      test(`${surface.label} (${surface.url}) — ${theme} mode at 375×667`, async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 })
        await loginAsSuperAdmin(page)
        await page.goto(surface.url)
        await forceTheme(page, theme)
        const samples: ContrastSample[] = await measureVisibleRoleBadges(page)
        expect(samples.length, `${surface.label} should render at least one badge`).toBeGreaterThan(0)
        for (const s of samples) {
          expect.soft(
            s.ratio,
            `${surface.label} ${theme} — ${s.selectorText} ratio (threshold ${s.threshold}:1)`
          ).toBeGreaterThanOrEqual(s.threshold)
        }
      })
    }
  }
})
