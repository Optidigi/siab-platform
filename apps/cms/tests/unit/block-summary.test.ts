import { describe, expect, it } from "vitest"
import { firstRichText, truncate } from "@/blocks/_summary"

describe("block summary helpers", () => {
  it("finds the first text node in children or items trees", () => {
    expect(
      firstRichText({
        t: "root",
        children: [
          { t: "paragraph", children: [] },
          { t: "paragraph", children: [{ t: "text", v: "First text" }] },
        ],
      }),
    ).toBe("First text")

    expect(
      firstRichText({
        t: "root",
        items: [{ t: "text", v: "From items" }],
      }),
    ).toBe("From items")
  })

  it("ignores missing or empty text values", () => {
    expect(firstRichText(null)).toBeUndefined()
    expect(firstRichText({ t: "text", v: "" })).toBeUndefined()
    expect(firstRichText({ t: "paragraph", children: [{ t: "text", v: 12 }] })).toBeUndefined()
  })

  it("truncates long labels with the existing ellipsis contract", () => {
    expect(truncate("abcdef", 4)).toBe("abc…")
    expect(truncate("abc", 4)).toBe("abc")
  })
})
