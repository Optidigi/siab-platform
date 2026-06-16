"use client"
import * as React from "react"
import type { ElementPath } from "../elementPath"

/** vaul snap-point identifiers — two detents; idle state hides the drawer entirely.
 *  0.42 = compact detent (opens here on selection) ·
 *  0.92 = editing detent (focus-pops here on field focus). */
export type MobileSnap = 0.42 | 0.92

/** One frame inside an array-drill (e.g. tapped "features" array → frame for it). */
export interface DrillFrame {
  blockIndex: number
  field: string
  itemIndex: number
  subField?: string
}

export interface MobileEditorState {
  /** Currently-selected element address, or null in idle mode. */
  selected: ElementPath | null
  /** Inspector bar snap point — the active vaul detent. */
  activeSnapPoint: MobileSnap
  /** Detent active before focus promoted the sheet; restored when focus leaves. */
  preFocusSnap: MobileSnap | null
  /** Stack of array-drill frames. Empty = no active drill. */
  drillStack: DrillFrame[]
}

export const initialMobileEditorState: MobileEditorState = {
  selected: null,
  activeSnapPoint: 0.42,
  preFocusSnap: null,
  drillStack: [],
}

export type MobileEditorAction =
  | { type: "SET_SELECTED"; path: ElementPath }
  | { type: "CLEAR_SELECTION" }
  | { type: "PUSH_DRILL"; frame: DrillFrame }
  | { type: "POP_DRILL" }
  | { type: "CLEAR_DRILL" }
  | { type: "EXPAND_TO"; snap: MobileSnap }
  | { type: "FOCUS_POP" }
  | { type: "RESTORE_PRE_FOCUS_SNAP" }

export function mobileEditorReducer(state: MobileEditorState, action: MobileEditorAction): MobileEditorState {
  switch (action.type) {
    case "SET_SELECTED": {
      const p = action.path
      // If the path includes a sub-field, seed TWO drill frames (item + sub-field)
      // so the array UI opens at Level 3 (single sub-field editor) while keeping
      // a parent item frame underneath for Back navigation.
      const drillStack: DrillFrame[] = p.itemIndex != null
        ? (
            p.subField
              ? [
                  { blockIndex: p.blockIndex, field: p.field, itemIndex: p.itemIndex },
                  { blockIndex: p.blockIndex, field: p.field, itemIndex: p.itemIndex, subField: p.subField },
                ]
              : [{ blockIndex: p.blockIndex, field: p.field, itemIndex: p.itemIndex }]
          )
        : []
      // Open at the compact detent; focusing a field pops it to 0.92.
      return { selected: p, activeSnapPoint: 0.42, preFocusSnap: null, drillStack }
    }
    case "CLEAR_SELECTION":
      return { selected: null, activeSnapPoint: 0.42, preFocusSnap: null, drillStack: [] }
    case "PUSH_DRILL":
      return { ...state, drillStack: [...state.drillStack, action.frame] }
    case "POP_DRILL":
      if (state.drillStack.length === 0) return state
      return { ...state, drillStack: state.drillStack.slice(0, -1) }
    case "CLEAR_DRILL":
      return { ...state, drillStack: [] }
    case "EXPAND_TO":
      return { ...state, activeSnapPoint: action.snap, preFocusSnap: null }
    case "FOCUS_POP":
      // A field was focused — pop the sheet to the editing detent so the field
      // clears the keyboard. Remember the previous detent so blur/keyboard
      // dismissal can return first-touch editing to the compact sheet.
      // The pop animates normally — iOS's native focus-scroll (which would
      // displace the sheet) is suppressed by useInspectorKeyboardLock (FE-71).
      if (state.activeSnapPoint === 0.92) return state
      return { ...state, activeSnapPoint: 0.92, preFocusSnap: state.activeSnapPoint }
    case "RESTORE_PRE_FOCUS_SNAP":
      if (state.preFocusSnap == null) return state
      return { ...state, activeSnapPoint: state.preFocusSnap, preFocusSnap: null }
    default: {
      const _exhaustive: never = action
      return state
    }
  }
}

interface MobileEditorContextValue {
  state: MobileEditorState
  setSelected: (path: ElementPath) => void
  clearSelection: () => void
  pushDrill: (frame: DrillFrame) => void
  popDrill: () => void
  clearDrill: () => void
  /** Change the snap detent. */
  expandTo: (snap: MobileSnap) => void
  /** Pop the sheet to the editing detent on field focus so fields clear the keyboard. */
  focusPop: () => void
  /** Restore the detent that was active before field focus promoted the sheet. */
  restorePreFocusSnap: () => void
}

const Ctx = React.createContext<MobileEditorContextValue | null>(null)

export const useMobileEditor = (): MobileEditorContextValue => {
  const v = React.useContext(Ctx)
  if (!v) throw new Error("useMobileEditor must be used inside <MobileEditorProvider>. Did the caller render outside the mobile editor surface?")
  return v
}

export const MobileEditorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = React.useReducer(mobileEditorReducer, initialMobileEditorState)
  const value = React.useMemo<MobileEditorContextValue>(() => ({
    state,
    setSelected: (path) => dispatch({ type: "SET_SELECTED", path }),
    clearSelection: () => dispatch({ type: "CLEAR_SELECTION" }),
    pushDrill: (frame) => dispatch({ type: "PUSH_DRILL", frame }),
    popDrill: () => dispatch({ type: "POP_DRILL" }),
    clearDrill: () => dispatch({ type: "CLEAR_DRILL" }),
    expandTo: (snap) => dispatch({ type: "EXPAND_TO", snap }),
    focusPop: () => dispatch({ type: "FOCUS_POP" }),
    restorePreFocusSnap: () => dispatch({ type: "RESTORE_PRE_FOCUS_SNAP" }),
  }), [state])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
