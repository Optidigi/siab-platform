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
})
