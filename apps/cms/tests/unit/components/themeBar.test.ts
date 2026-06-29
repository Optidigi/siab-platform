import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const read = (path: string) => readFileSync(path, "utf8")

describe("ThemeBar controls", () => {
  it("keeps the shape panel focused on radius only", () => {
    const themeBar = read("src/components/editor/theme/theme-bar.tsx")
    const radiusControl = read("src/components/editor/theme/radius-control.tsx")
    const pageForm = read("src/components/forms/PageForm.tsx")

    expect(themeBar).toContain('type Segment = "palette" | "fonts" | "shape"')
    expect(themeBar).not.toContain("densityLevels")
    expect(themeBar).not.toContain("stylePresetLevels")
    expect(pageForm).not.toContain("densityLevels={DENSITY_PRESETS}")
    expect(pageForm).not.toContain("stylePresetLevels={STYLE_PRESETS}")
    expect(radiusControl).toContain("export const ShapeControl")
    expect(radiusControl).not.toContain("value={theme?.density")
    expect(radiusControl).not.toContain("value={theme?.stylePreset")
  })
})
