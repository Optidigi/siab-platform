"use client"
import * as React from "react"
import type { ElementPath } from "./elementPath"
import type { CanvasView } from "./canvasView"

interface CanvasSelectionValue {
  view: CanvasView
  selected: ElementPath | null
  select: React.Dispatch<React.SetStateAction<ElementPath | null>>
}

const Ctx = React.createContext<CanvasSelectionValue>({
  view: "canvas",
  selected: null,
  select: (() => {}) as React.Dispatch<React.SetStateAction<ElementPath | null>>,
})

export const CanvasSelectionProvider = Ctx.Provider
export const useCanvasSelection = () => React.useContext(Ctx)
