import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const read = (path: string) => readFileSync(path, "utf8")

describe("canvas chrome manifest wiring", () => {
  it("passes the tenant manifest into desktop and mobile block mutators", () => {
    expect(read("src/components/editor/canvas/CanvasMode.tsx")).toContain("useCanvasBlocks(manifest)")
    expect(read("src/components/editor/canvas/mobile/CanvasMobile.tsx")).toContain("useCanvasBlocks(manifest)")
  })
})
