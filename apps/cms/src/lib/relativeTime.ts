export function relativeTime(iso: string, locale = "en"): string {
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.floor(ms / 60000)
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto", style: "short" })
  if (min < 1) return rtf.format(0, "minute")
  if (min < 60) return rtf.format(-min, "minute")
  const h = Math.floor(min / 60)
  if (h < 24) return rtf.format(-h, "hour")
  const d = Math.floor(h / 24)
  if (d < 7) return rtf.format(-d, "day")
  return new Date(iso).toLocaleDateString(locale)
}
