// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { FormProvider, useForm } from "react-hook-form"
import * as React from "react"
import { useCanvasBlocks } from "@/components/editor/canvas/useCanvasBlocks"
import type { RtManifest } from "@/lib/richText/manifest"

const wrapper = (defaultValues: { blocks: any[] }) => {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    const form = useForm({ defaultValues })
    return <FormProvider {...form}>{children}</FormProvider>
  }
}

const baseManifest: RtManifest = {
  version: 1,
  inlineMarks: { bold: true, italic: true },
  blockTypes: { paragraph: true, heading: { levels: [2, 3] } },
}

describe("useCanvasBlocks.insertBlockAt — defaultAnchor pre-fill", () => {
  it("pre-fills anchor from manifest.blocks[].defaultAnchor on insert", () => {
    const manifest: RtManifest = {
      ...baseManifest,
      blocks: [{ slug: "featureList", defaultAnchor: "services" }],
    }
    const { result } = renderHook(() => useCanvasBlocks(manifest), {
      wrapper: wrapper({ blocks: [] }),
    })
    act(() => {
      result.current.insertBlockAt(0, "featureList")
    })
    expect(result.current.blocks[0]).toMatchObject({
      blockType: "featureList",
      anchor: "services",
    })
  })

  it("does not pre-fill anchor when manifest has no defaultAnchor for the slug", () => {
    const manifest: RtManifest = {
      ...baseManifest,
      blocks: [{ slug: "featureList" }],
    }
    const { result } = renderHook(() => useCanvasBlocks(manifest), {
      wrapper: wrapper({ blocks: [] }),
    })
    act(() => {
      result.current.insertBlockAt(0, "featureList")
    })
    expect(result.current.blocks[0]).toMatchObject({ blockType: "featureList" })
    expect(result.current.blocks[0].anchor).toBeUndefined()
  })

  it("works when no manifest is passed (backwards-compat)", () => {
    const { result } = renderHook(() => useCanvasBlocks(), {
      wrapper: wrapper({ blocks: [] }),
    })
    act(() => {
      result.current.insertBlockAt(0, "hero")
    })
    expect(result.current.blocks[0]).toMatchObject({ blockType: "hero" })
  })
})
