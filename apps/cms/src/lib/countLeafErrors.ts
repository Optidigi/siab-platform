/**
 * Recursively count react-hook-form leaf errors. Top-level Object.keys()
 * collapses nested array/object errors into one key, which makes save-state
 * badges undercount validation issues in complex forms.
 */
export function countLeafErrors(node: unknown): number {
  if (!node || typeof node !== "object") return 0
  const obj = node as Record<string, unknown>
  if (typeof obj.message === "string" || typeof obj.type === "string") return 1
  let total = 0
  for (const value of Object.values(obj)) {
    if (Array.isArray(value)) {
      for (const item of value) total += countLeafErrors(item)
    } else if (value && typeof value === "object") {
      total += countLeafErrors(value)
    }
  }
  return total
}
