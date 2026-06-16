import type { SaveStatus } from "@/components/save-ui/save-status-bar"

export function deriveSaveStatus({
  pending,
  hasError,
  isDirty,
  showSaved,
}: {
  pending: boolean
  hasError: boolean
  isDirty: boolean
  showSaved: boolean
}): SaveStatus {
  if (pending) return "saving"
  if (hasError) return "error"
  if (isDirty) return "dirty"
  return showSaved ? "saved" : "idle"
}
