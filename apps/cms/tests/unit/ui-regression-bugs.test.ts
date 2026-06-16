import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const read = (path: string) => readFileSync(path, "utf8")

describe("observed UI bug regressions", () => {
  it("keeps the sidebar selected accent on the brand token", () => {
    const sidebar = read("src/components/layout/AppSidebar.tsx")

    expect(sidebar).toContain("[--sidebar-primary:var(--brand)]")
    expect(sidebar).toContain("[--sidebar-primary-foreground:var(--brand-foreground)]")
  })

  it("renders the typed confirmation phrase through next-intl rich markup", () => {
    const dialog = read("src/components/typed-confirm-dialog.tsx")
    const en = read("src/locales/en.json")
    const nl = read("src/locales/nl.json")

    expect(dialog).toContain('t.rich("typeToConfirm"')
    expect(en).toContain('"typeToConfirm": "Type <phrase></phrase> to confirm:"')
    expect(nl).toContain('"typeToConfirm": "Typ <phrase></phrase> om te bevestigen:"')
  })

  it("routes desktop canvas section deletes through a confirmation dialog", () => {
    const canvasMode = read("src/components/editor/canvas/CanvasMode.tsx")

    expect(canvasMode).toContain("const [deleteTargetIndex, setDeleteTargetIndex]")
    expect(canvasMode).toContain("const requestDeleteBlock = (i: number) => {")
    expect(canvasMode).toContain("onDelete={() => requestDeleteBlock(i)}")
    expect(canvasMode).toContain("onDelete={requestDeleteBlock}")
    expect(canvasMode).toContain("<ConfirmDialog")
    expect(canvasMode).toContain('title={t("deleteBlockTitle")}')
    expect(canvasMode).toContain('description={t("deleteBlockDescription", { label: deleteTargetLabel })}')
  })
})
