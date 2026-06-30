import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const root = join(__dirname, "..", "..")
const read = (file: string) => readFileSync(join(root, file), "utf8")

describe("customer preview UI", () => {
  it("uses a dedicated customer preview canvas mode without editor metadata badges", () => {
    const customizer = read("src/components/preview/PreviewCustomizer.tsx")

    expect(customizer).toContain('view: "preview"')
    expect(customizer).toContain('view="preview"')
    expect(customizer).toContain('variant="success"')
    expect(customizer).toContain("reviewHref")
    expect(customizer).not.toContain("stylesReady")
    expect(customizer).not.toContain("pagesNav")
  })

  it("guards customer preview media with preview grants instead of making tenant media public", () => {
    const route = read("src/app/(payload)/siab-media/[tenantId]/[...path]/route.ts")
    const access = read("src/lib/preview/previewAccess.ts")

    expect(route).toContain("previewAuth.api.getSession")
    expect(route).toContain("hasActivePreviewGrantForTenant")
    expect(route).toContain("isPreviewMediaHost")
    expect(access).toContain("hasActivePreviewGrantForTenant")
  })

  it("exposes a guarded review route and stores customer notes on the current preview run", () => {
    const page = read("src/app/(frontend)/(site-preview)/[clientSlug]/review/page.tsx")
    const action = read("src/app/(frontend)/(site-preview)/[clientSlug]/review/actions.ts")
    const review = read("src/components/preview/PreviewReview.tsx")

    expect(page).toContain("isPreviewHost")
    expect(page).toContain("previewAuth.api.getSession")
    expect(action).toContain("clientApproval")
    expect(action).toContain("reviewNotes")
    expect(review).toContain("Textarea")
  })
})
