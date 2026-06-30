import { describe, it, expect } from "vitest"
import { isCustomerPreviewView, isReadOnlyView } from "@/components/editor/canvas/canvasView"

describe("isReadOnlyView", () => {
  it("treats sidebar as read-only", () => {
    expect(isReadOnlyView("sidebar")).toBe(true)
  })

  it("treats mobile as read-only", () => {
    expect(isReadOnlyView("mobile")).toBe(true)
  })

  it("treats customer preview as read-only", () => {
    expect(isReadOnlyView("preview")).toBe(true)
    expect(isCustomerPreviewView("preview")).toBe(true)
  })

  it("does not treat canvas as read-only", () => {
    expect(isReadOnlyView("canvas")).toBe(false)
    expect(isCustomerPreviewView("canvas")).toBe(false)
  })
})
