import type { RtRoot, RtBlock, RtInline, RtMark } from "./RtNode"
import type { RtManifest } from "./manifest"

export type ManifestValidationResult =
  | { ok: true }
  | { ok: false; errors: string[] }

const isSafeHref = (raw: unknown): boolean => {
  if (typeof raw !== "string" || !raw) return false
  if (raw.startsWith("/")) return true
  try {
    const u = new URL(raw)
    return ["http:", "https:", "mailto:", "tel:"].includes(u.protocol)
  } catch { return false }
}

const allowedMarks = (m: RtManifest): Set<RtMark> => {
  const out = new Set<RtMark>()
  if (m.inlineMarks.bold) out.add("bold")
  if (m.inlineMarks.italic) out.add("italic")
  if (m.inlineMarks.underline) out.add("underline")
  if (m.inlineMarks.code) out.add("code")
  if (m.inlineMarks.strikethrough) out.add("strikethrough")
  return out
}

export const validateAgainstManifest = (root: RtRoot, m: RtManifest): ManifestValidationResult => {
  const errors: string[] = []
  const styleById = new Map((m.typeStyles ?? []).map((s) => [s.id, s]))
  const colors = new Set((m.colorTokens ?? []).map((c) => c.id))
  const fonts = new Set((m.fontFamilies ?? []).map((f) => f.id))
  const themedById = new Map((m.themedNodes ?? []).map((n) => [n.id, n]))
  const marks = allowedMarks(m)
  const headingLevels = new Set(m.blockTypes.heading?.levels ?? [])

  const walkInline = (n: RtInline, path: string) => {
    if (n.t === "text") {
      for (const mark of n.marks ?? []) {
        if (!marks.has(mark)) errors.push(`${path}: mark "${mark}" not enabled in manifest`)
      }
      if (n.style) {
        const def = styleById.get(n.style)
        if (!def) errors.push(`${path}: typeStyle "${n.style}" not in manifest`)
        else if (def.appliesTo !== "inline") {
          errors.push(`${path}: typeStyle "${n.style}" appliesTo "${def.appliesTo}" not applicable to inline text`)
        }
      }
      if (n.color && !colors.has(n.color)) errors.push(`${path}: colorToken "${n.color}" not in manifest`)
      if (n.font && !fonts.has(n.font)) errors.push(`${path}: fontFamily "${n.font}" not in manifest`)
    } else if (n.t === "link") {
      n.children.forEach((c, i) => walkInline(c, `${path}.link[${i}]`))
    }
  }

  const walkBlock = (n: RtBlock, path: string) => {
    switch (n.t) {
      case "paragraph":
        if ("style" in n && n.style) {
          const def = styleById.get(n.style as string)
          if (!def) errors.push(`${path}: typeStyle "${n.style}" not in manifest`)
          else if (def.appliesTo !== "paragraph") {
            errors.push(`${path}: typeStyle "${n.style}" appliesTo "${def.appliesTo}" not applicable to paragraph`)
          }
        }
        n.children.forEach((c, i) => walkInline(c, `${path}.paragraph[${i}]`))
        return
      case "heading":
        if (!headingLevels.has(n.level)) errors.push(`${path}: heading level ${n.level} not in manifest`)
        if ("style" in n && n.style) {
          const def = styleById.get(n.style as string)
          if (!def) errors.push(`${path}: typeStyle "${n.style}" not in manifest`)
          else if (def.appliesTo !== "heading") {
            errors.push(`${path}: typeStyle "${n.style}" appliesTo "${def.appliesTo}" not applicable to heading`)
          }
        }
        n.children.forEach((c, i) => walkInline(c, `${path}.heading[${i}]`))
        return
      case "list":
        if (!n.ordered && !m.blockTypes.bulletList) errors.push(`${path}: bullet list not enabled in manifest`)
        if (n.ordered && !m.blockTypes.orderedList) errors.push(`${path}: ordered list not enabled in manifest`)
        n.items.forEach((li, i) => li.children.forEach((c, j) => walkBlock(c, `${path}.list[${i}].li[${j}]`)))
        return
      case "blockquote":
        if (!m.blockTypes.blockquote) errors.push(`${path}: blockquote not enabled in manifest`)
        n.children.forEach((c, i) => walkBlock(c, `${path}.blockquote[${i}]`))
        return
      case "divider":
        if (!m.blockTypes.divider) errors.push(`${path}: divider not enabled in manifest`)
        return
      case "themed": {
        const def = themedById.get(n.id)
        if (!def) {
          errors.push(`${path}: themedNode "${n.id}" not in manifest`)
          return
        }
        for (const f of def.fields) {
          const v = (n.props as Record<string, unknown>)[f.name]
          const present = v !== undefined && v !== null && v !== ""
          if ("required" in f && f.required && !present) {
            errors.push(`${path}: themedNode "${n.id}" missing required field "${f.name}"`)
          }
          if (f.type === "url" && present && !isSafeHref(v)) {
            errors.push(`${path}: themedNode "${n.id}" field "${f.name}" has unsafe URL scheme`)
          }
        }
        n.children?.forEach((c, i) => walkBlock(c, `${path}.themed[${n.id}][${i}]`))
        return
      }
    }
  }

  if (root.variant === "block") {
    root.children.forEach((c, i) => walkBlock(c, `root[${i}]`))
  } else {
    root.children.forEach((c, i) => walkInline(c, `root[${i}]`))
  }

  return errors.length === 0 ? { ok: true } : { ok: false, errors }
}
