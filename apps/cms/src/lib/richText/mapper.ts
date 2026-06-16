import { parseFragment, type DefaultTreeAdapterMap } from "parse5"
import type {
  RtBlock, RtInline, RtParagraph, RtHeading, RtText, RtRoot, RtBlockRoot, RtInlineRoot
} from "./RtNode"
import type { RtManifest } from "./manifest"
import type { ThemedMatcher } from "./themedMatchers"

export interface MapOptions {
  variant: "block" | "inline"
  manifest: RtManifest
  maxNodes?: number
  themedMatchers?: ThemedMatcher[]
}

type P5Node = DefaultTreeAdapterMap["node"]
type P5Element = DefaultTreeAdapterMap["element"]
type P5TextNode = DefaultTreeAdapterMap["textNode"]

const isElement = (n: P5Node): n is P5Element => n.nodeName !== "#text" && "tagName" in n
const isText    = (n: P5Node): n is P5TextNode => n.nodeName === "#text"

const DENY_TAGS = new Set([
  "script", "style", "iframe", "object", "embed", "noscript",
  "template", "link", "meta", "base", "form", "input", "button",
  "select", "textarea", "video", "audio", "canvas", "svg", "math",
])

const isSafeHref = (raw: string | undefined): raw is string => {
  if (!raw) return false
  if (raw.startsWith("/")) return true
  try {
    const u = new URL(raw)
    return ["http:", "https:", "mailto:", "tel:"].includes(u.protocol)
  } catch {
    return false
  }
}

const getAttr = (el: P5Element, name: string): string | undefined =>
  el.attrs.find((a) => a.name === name)?.value

const clampHeadingLevel = (raw: number, manifest: RtManifest): 2 | 3 | 4 => {
  const allowed = manifest.blockTypes.heading?.levels ?? [2]
  if (allowed.includes(raw as 2 | 3 | 4)) return raw as 2 | 3 | 4
  const min = Math.min(...allowed) as 2 | 3 | 4
  const max = Math.max(...allowed) as 2 | 3 | 4
  return raw < min ? min : max
}

const MARK_ORDER: Record<"bold" | "italic" | "underline" | "code" | "strikethrough", number> = {
  bold: 0, italic: 1, strikethrough: 2, underline: 3, code: 4,
}

const sortMarks = (marks: Array<"bold" | "italic" | "underline" | "code" | "strikethrough">): typeof marks => {
  return [...marks].sort((a, b) => MARK_ORDER[a] - MARK_ORDER[b])
}

const TAG_TO_MARK: Record<string, "bold" | "italic" | "underline" | "code" | "strikethrough"> = {
  strong: "bold", b: "bold",
  em: "italic", i: "italic",
  u: "underline",
  code: "code",
  s: "strikethrough", strike: "strikethrough", del: "strikethrough",
}

const markAllowed = (m: RtManifest, mark: "bold" | "italic" | "underline" | "code" | "strikethrough"): boolean => {
  return Boolean(m.inlineMarks[mark])
}

/** Extract declared color id from element classes (rt-color-{id}), or undefined. */
const extractColorId = (el: P5Element, manifest: RtManifest): string | undefined => {
  const cls = getAttr(el, "class") ?? ""
  const colorIds = new Set((manifest.colorTokens ?? []).map((c) => c.id))
  for (const token of cls.split(/\s+/)) {
    if (token.startsWith("rt-color-")) {
      const id = token.slice("rt-color-".length)
      if (colorIds.has(id)) return id
    }
  }
  return undefined
}

/** Extract declared font family id from element classes (rt-font-{id}), or undefined. */
const extractFontId = (el: P5Element, manifest: RtManifest): string | undefined => {
  const cls = getAttr(el, "class") ?? ""
  const fontIds = new Set((manifest.fontFamilies ?? []).map((f) => f.id))
  for (const token of cls.split(/\s+/)) {
    if (token.startsWith("rt-font-")) {
      const id = token.slice("rt-font-".length)
      if (fontIds.has(id)) return id
    }
  }
  return undefined
}

/** Extract declared inline typeStyle id from element classes (rt-type-{id}), or undefined. */
const extractInlineStyleId = (el: P5Element, manifest: RtManifest): string | undefined => {
  const cls = getAttr(el, "class") ?? ""
  const inlineStyleIds = new Set(
    (manifest.typeStyles ?? [])
      .filter((s) => s.appliesTo === "inline")
      .map((s) => s.id),
  )
  for (const token of cls.split(/\s+/)) {
    if (token.startsWith("rt-type-")) {
      const id = token.slice("rt-type-".length)
      if (inlineStyleIds.has(id)) return id
    }
  }
  return undefined
}

/** Extract declared paragraph typeStyle id from element classes (rt-type-{id}), or undefined. */
const extractParagraphStyleId = (el: P5Element, manifest: RtManifest): string | undefined => {
  const cls = getAttr(el, "class") ?? ""
  const paragraphStyleIds = new Set(
    (manifest.typeStyles ?? [])
      .filter((s) => s.appliesTo === "paragraph")
      .map((s) => s.id),
  )
  for (const token of cls.split(/\s+/)) {
    if (token.startsWith("rt-type-")) {
      const id = token.slice("rt-type-".length)
      if (paragraphStyleIds.has(id)) return id
    }
  }
  return undefined
}

/** Extract declared heading typeStyle id from element classes (rt-type-{id}), or undefined. */
const extractHeadingStyleId = (el: P5Element, manifest: RtManifest): string | undefined => {
  const cls = getAttr(el, "class") ?? ""
  const headingStyleIds = new Set(
    (manifest.typeStyles ?? [])
      .filter((s) => s.appliesTo === "heading")
      .map((s) => s.id),
  )
  for (const token of cls.split(/\s+/)) {
    if (token.startsWith("rt-type-")) {
      const id = token.slice("rt-type-".length)
      if (headingStyleIds.has(id)) return id
    }
  }
  return undefined
}

/**
 * Stamp font/color/style onto RtText nodes that don't already have those fields.
 * Inner spans with their own font/color/style win (we don't overwrite existing values).
 */
const stampInlineTokens = (
  nodes: RtInline[],
  color: string | undefined,
  style: string | undefined,
  font: string | undefined,
): RtInline[] => {
  if (!color && !style && !font) return nodes
  return nodes.map((node) => {
    if (node.t !== "text") return node
    const next: RtText = { ...node }
    if (color && !next.color) next.color = color
    if (style && !next.style) next.style = style
    if (font && !next.font) next.font = font
    return next
  })
}

const walkInline = (nodes: P5Node[], manifest: RtManifest, marks: Set<"bold"|"italic"|"underline"|"code"|"strikethrough"> = new Set()): RtInline[] => {
  const out: RtInline[] = []
  for (const n of nodes) {
    if (isText(n)) {
      if (!n.value) continue
      const arr = sortMarks(Array.from(marks))
      if (arr.length > 0) out.push({ t: "text", v: n.value, marks: arr })
      else out.push({ t: "text", v: n.value })
    } else if (isElement(n)) {
      const tag = n.tagName.toLowerCase()
      if (DENY_TAGS.has(tag)) continue
      if (tag === "br") {
        out.push({ t: "linebreak" })
        continue
      }
      if (tag === "a") {
        const href = getAttr(n, "href")
        if (isSafeHref(href)) {
          out.push({ t: "link", href, children: walkInline(n.childNodes as P5Node[], manifest, marks) })
          continue
        }
        // Unsafe / missing href → drop link wrapper, keep text
        out.push(...walkInline(n.childNodes as P5Node[], manifest, marks))
        continue
      }
      const mark = TAG_TO_MARK[tag]
      if (mark && markAllowed(manifest, mark)) {
        const next = new Set(marks); next.add(mark)
        out.push(...walkInline(n.childNodes as P5Node[], manifest, next))
      } else {
        // Check for rt-color-* / rt-type-* classes on span/generic elements
        const colorId = extractColorId(n, manifest)
        const styleId = extractInlineStyleId(n, manifest)
        const fontId = extractFontId(n, manifest)
        const children = walkInline(n.childNodes as P5Node[], manifest, marks)
        out.push(...stampInlineTokens(children, colorId, styleId, fontId))
      }
    }
  }
  return out
}

const walkBlocks = (nodes: P5Node[], manifest: RtManifest, matchers: ThemedMatcher[] = []): RtBlock[] => {
  const out: RtBlock[] = []
  for (const n of nodes) {
    if (isText(n)) {
      // Stray text at block level — wrap in a paragraph if non-blank
      const t = n.value?.trim()
      if (t) out.push({ t: "paragraph", children: [{ t: "text", v: n.value }] })
      continue
    }
    if (!isElement(n)) continue
    if (DENY_TAGS.has(n.tagName.toLowerCase())) continue

    // Themed-node matchers run first
    let themedHit = false
    for (const m of matchers) {
      if (m.match(n)) { out.push(m.build(n)); themedHit = true; break }
    }
    if (themedHit) continue

    const tag = n.tagName.toLowerCase()
    if (tag === "p") {
      const paragraph: RtParagraph = { t: "paragraph", children: walkInline(n.childNodes as P5Node[], manifest) }
      const paragraphStyleId = extractParagraphStyleId(n, manifest)
      if (paragraphStyleId) paragraph.style = paragraphStyleId
      out.push(paragraph)
    } else if (/^h[1-6]$/.test(tag)) {
      const level = clampHeadingLevel(parseInt(tag.slice(1), 10), manifest)
      const headingStyleId = extractHeadingStyleId(n, manifest)
      const heading: RtHeading = { t: "heading", level, children: walkInline(n.childNodes as P5Node[], manifest) }
      if (headingStyleId) heading.style = headingStyleId
      out.push(heading)
    } else if (tag === "ul" || tag === "ol") {
      const items = (n.childNodes as P5Node[])
        .filter((c): c is P5Element => isElement(c) && c.tagName.toLowerCase() === "li")
        .map((li) => ({
          t: "listItem" as const,
          children: walkListItem(li.childNodes as P5Node[], manifest, matchers),
        }))
      out.push({ t: "list", ordered: tag === "ol", items })
    } else if (tag === "blockquote") {
      out.push({ t: "blockquote", children: walkBlocks(n.childNodes as P5Node[], manifest, matchers) })
    } else if (tag === "hr") {
      out.push({ t: "divider" })
    } else if (tag === "br") {
      // Ignored in block context
      continue
    } else {
      // Transparent — recurse so inline-bearing wrappers (div/section/span) contribute
      out.push(...walkBlocks(n.childNodes as P5Node[], manifest, matchers))
    }
  }
  return out
}

const walkListItem = (nodes: P5Node[], manifest: RtManifest, matchers: ThemedMatcher[] = []): RtBlock[] => {
  const hasBlockChild = nodes.some((n) =>
    isElement(n) && /^(p|h[1-6]|ul|ol|blockquote|hr|div|section|article)$/i.test(n.tagName)
  )
  if (hasBlockChild) return walkBlocks(nodes, manifest, matchers)
  return [{ t: "paragraph", children: walkInline(nodes, manifest) }]
}

const countNodes = (nodes: P5Node[]): number => {
  let n = 0
  for (const c of nodes) {
    n++
    if (isElement(c)) n += countNodes(c.childNodes as P5Node[])
  }
  return n
}

export const mapHtmlToRt = (html: string, opts: MapOptions): RtRoot => {
  if (!html.trim()) {
    return opts.variant === "block"
      ? { t: "root", variant: "block", children: [] } as RtBlockRoot
      : { t: "root", variant: "inline", children: [] } as RtInlineRoot
  }
  const frag = parseFragment(html)
  const cap = opts.maxNodes ?? 5000
  if (countNodes(frag.childNodes as P5Node[]) > cap) {
    return opts.variant === "block"
      ? { t: "root", variant: "block", children: [] }
      : { t: "root", variant: "inline", children: [] }
  }
  const matchers = opts.themedMatchers ?? []
  if (opts.variant === "block") {
    return { t: "root", variant: "block", children: walkBlocks(frag.childNodes as P5Node[], opts.manifest, matchers) }
  }
  return { t: "root", variant: "inline", children: walkInline(frag.childNodes as P5Node[], opts.manifest) }
}
