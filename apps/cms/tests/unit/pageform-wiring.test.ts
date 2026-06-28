import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const read = (relativePath: string) =>
  readFileSync(path.resolve(process.cwd(), relativePath), "utf8")

describe("PageForm wiring boundaries", () => {
  it("keeps the rich-text manifest context outside the PageForm module", () => {
    expect(read("src/components/editor/RtManifestContext.tsx")).toContain("RtManifestProvider")
    expect(read("src/components/forms/PageForm.tsx")).toContain(
      'export { useRtManifest }',
    )
    expect(read("src/components/editor/FieldRenderer.tsx")).toContain(
      'from "@/components/editor/RtManifestContext"',
    )
    expect(read("src/components/editor/richText/PastePlugin.tsx")).toContain(
      'from "@/components/editor/RtManifestContext"',
    )
    expect(read("src/components/editor/FieldRenderer.tsx")).not.toContain(
      'from "@/components/forms/PageForm"',
    )
    expect(read("src/components/editor/richText/PastePlugin.tsx")).not.toContain(
      'from "@/components/forms/PageForm"',
    )
  })

  it("routes official legacy tenant canvas rendering through the shared renderer", () => {
    const canvasMode = read("src/components/editor/canvas/CanvasMode.tsx")
    const pageForm = read("src/components/forms/PageForm.tsx")

    expect(canvasMode).toContain('from "@siteinabox/site-renderer"')
    expect(canvasMode).toContain("resolveLegacyTenant")
    expect(canvasMode).toContain("<SitePageRenderer")
    expect(pageForm).toContain("rendererSettings")
    expect(pageForm).toContain("tenantSlug")
  })

  it("keeps live publishing separate from page save and publishes current CMS pages", () => {
    const pageForm = read("src/components/forms/PageForm.tsx")

    expect(pageForm).toContain("Publish live")
    expect(pageForm).toContain("canPublishLive")
    expect(pageForm).toContain('fetch("/api/publish"')
    expect(pageForm).toContain("includeAllPublishedPages: true")
    expect(pageForm).toContain("manualActivation: true")
  })
})
