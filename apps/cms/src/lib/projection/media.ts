export type ProjectedMedia =
  | { id: number | string }
  | {
      url: unknown
      filename: unknown
      alt: unknown
      width: unknown
      height: unknown
    }

export const mediaToJson = (media: unknown): ProjectedMedia | null => {
  if (media == null) return null
  if (typeof media === "string" || typeof media === "number") return { id: media }
  const value = media as { url?: unknown; filename?: unknown; alt?: unknown; width?: unknown; height?: unknown }
  return {
    url: value.url,
    filename: value.filename,
    alt: value.alt,
    width: value.width,
    height: value.height,
  }
}

export const isPopulatedMediaShape = (value: unknown): boolean =>
  !!value && typeof value === "object" && "url" in value && "filename" in value
