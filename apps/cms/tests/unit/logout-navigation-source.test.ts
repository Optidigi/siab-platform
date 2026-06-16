import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const read = (path: string) => readFileSync(path, "utf8")

describe("logout navigation", () => {
  it("uses a hard login navigation after clearing auth state", () => {
    const source = read("src/components/layout/UserMenu.tsx")

    expect(source).toContain('window.location.replace("/login")')
    expect(source).not.toContain("router.refresh()")
    expect(source).not.toContain('router.replace("/login")')
  })
})
