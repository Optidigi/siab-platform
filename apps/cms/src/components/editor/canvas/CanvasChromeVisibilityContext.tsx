"use client"
import * as React from "react"

type CanvasChromeVisibilityValue = {
  visible: boolean
  setVisible: (next: boolean) => void
}

const defaultValue: CanvasChromeVisibilityValue = {
  visible: true,
  setVisible: () => {},
}

const CanvasChromeVisibilityContext = React.createContext<CanvasChromeVisibilityValue>(defaultValue)

export const CanvasChromeVisibilityProvider = CanvasChromeVisibilityContext.Provider

export const useCanvasChromeVisibility = () => React.useContext(CanvasChromeVisibilityContext)
