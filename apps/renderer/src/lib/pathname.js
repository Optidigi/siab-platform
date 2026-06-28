export function safeDecodeURIComponent(value) {
  try {
    return decodeURIComponent(value)
  } catch {
    return null
  }
}

export function pathnameToSlug(pathname) {
  const cleanPath = pathname.split(/[?#]/, 1)[0] ?? "/"
  const withoutSlashes = cleanPath.replace(/^\/+|\/+$/g, "")
  return withoutSlashes === "" ? "index" : safeDecodeURIComponent(withoutSlashes)
}
