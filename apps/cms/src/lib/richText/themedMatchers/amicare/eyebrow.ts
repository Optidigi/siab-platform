import type { ThemedMatcher, P5Element } from "../types"

const classListOf = (el: P5Element): string[] => {
  const cls = el.attrs.find((a) => a.name === "class")?.value ?? ""
  return cls.split(/\s+/).filter(Boolean)
}

const innerText = (el: P5Element): string => {
  let s = ""
  for (const c of el.childNodes ?? []) {
    if (c.nodeName === "#text") s += (c as any).value ?? ""
    else if ("childNodes" in c) s += innerText(c as P5Element)
  }
  return s.trim()
}

export const eyebrowMatcher: ThemedMatcher = {
  id: "eyebrow",
  match: (el) => {
    if (el.tagName !== "span") return false
    const cls = classListOf(el)
    return cls.some((c) => c.startsWith("-rotate-")) && cls.some((c) => c === "text-accent")
  },
  build: (el) => ({ t: "themed", id: "eyebrow", props: { text: innerText(el) } }),
}
