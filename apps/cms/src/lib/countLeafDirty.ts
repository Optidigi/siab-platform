/**
 * react-hook-form's `dirtyFields` is a nested object mirroring the form
 * schema:
 *   { title: true, blocks: [{ headline: true }, { subheadline: true }],
 *     seo: { title: true } }
 *
 * Counting top-level keys (`Object.keys(dirtyFields).length`) collapses
 * every nested edit under a single key — so editing 5 fields inside one
 * group shows "1 unsaved" forever, looking exactly like the dirty tracker
 * is broken. Recurse instead and count the `true` leaves.
 *
 * FN-2026-0065 (page editor) / FE-58 — the shared counter behind every CMS
 * save badge. Feed it `form.formState.dirtyFields`.
 */
export function countLeafDirty(node: unknown): number {
  if (node === undefined || node === null) return 0
  if (node === true) return 1
  if (node === false) return 0
  if (typeof node !== "object") return 0
  let total = 0
  if (Array.isArray(node)) {
    for (const item of node) total += countLeafDirty(item)
  } else {
    for (const v of Object.values(node as Record<string, unknown>)) {
      total += countLeafDirty(v)
    }
  }
  return total
}
