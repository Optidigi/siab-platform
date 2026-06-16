import { describe, expect, it } from "vitest"

describe("loadTenantCss — color token mirror to admin scope", () => {
  it("emits --rt-tenant-color-* declarations alongside the scoped block", async () => {
    const { __transformForTest } = await import("@/lib/editor/loadTenantCss")
    const input = `
      @theme {
        --color-accent: #A04E32;
        --color-ink: #1F1A14;
        --font-sans: 'Inter';
      }
    `
    const out = __transformForTest(input)
    // Tenant-scope copy of colors lives under .rt-canvas (via :root).
    expect(out).toMatch(/\.rt-canvas\s*\{[^}]*--color-accent\s*:/)
    // Admin-scope mirror lives under :root as --rt-tenant-color-*.
    expect(out).toMatch(/:root\s*\{[^}]*--rt-tenant-color-accent\s*:\s*#A04E32/)
    expect(out).toMatch(/:root\s*\{[^}]*--rt-tenant-color-ink\s*:\s*#1F1A14/)
    // Font mirror still works (pre-existing behavior).
    expect(out).toMatch(/--rt-tenant-font-sans/)
  })
})
