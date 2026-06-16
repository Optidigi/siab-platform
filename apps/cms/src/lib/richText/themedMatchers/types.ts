import type { DefaultTreeAdapterMap } from "parse5"
import type { RtThemed } from "../RtNode"

export type P5Element = DefaultTreeAdapterMap["element"]

export interface ThemedMatcher {
  id: string
  match: (el: P5Element) => boolean
  build: (el: P5Element) => RtThemed
}
