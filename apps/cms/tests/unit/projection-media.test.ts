import { describe, expect, it } from "vitest"
import { isPopulatedMediaShape, mediaToJson } from "@/lib/projection/media"

describe("projection media helpers", () => {
  it("serializes raw upload relationship IDs as references", () => {
    expect(mediaToJson(12)).toEqual({ id: 12 })
    expect(mediaToJson("media-12")).toEqual({ id: "media-12" })
  })

  it("serializes populated upload relationships to public media fields", () => {
    expect(
      mediaToJson({
        id: 12,
        url: "/media/logo.png",
        filename: "logo.png",
        alt: "Logo",
        width: 100,
        height: 80,
        mimeType: "image/png",
      }),
    ).toEqual({
      url: "/media/logo.png",
      filename: "logo.png",
      alt: "Logo",
      width: 100,
      height: 80,
    })
  })

  it("detects the populated media shape used by recursive page projection", () => {
    expect(isPopulatedMediaShape({ url: "/media/logo.png", filename: "logo.png" })).toBe(true)
    expect(isPopulatedMediaShape({ id: 12 })).toBe(false)
    expect(isPopulatedMediaShape(null)).toBe(false)
  })
})
