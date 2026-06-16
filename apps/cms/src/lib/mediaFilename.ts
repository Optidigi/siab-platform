import path from "node:path"
import { ValidationError } from "payload"

const mediaFilenameErrorMessage =
  "Invalid media filename. Use a non-empty file name without path separators, NUL bytes, absolute paths, or dot segments."

export const mediaFilenameViolation = (value: unknown): string | null => {
  if (typeof value !== "string") return "not-string"
  if (value.length === 0) return "empty"
  if (value.includes("\0")) return "nul"
  if (value === "." || value === "..") return "dot-segment"
  if (value.includes("/") || value.includes("\\")) return "separator"
  if (path.isAbsolute(value) || path.win32.isAbsolute(value)) return "absolute"
  if (path.basename(value) !== value || path.win32.basename(value) !== value) return "segment"
  return null
}

export const isSafeMediaFilename = (value: unknown): value is string =>
  mediaFilenameViolation(value) == null

export const assertSafeMediaFilename = (value: unknown): string => {
  if (isSafeMediaFilename(value)) return value

  throw new ValidationError({
    collection: "media",
    errors: [
      {
        path: "filename",
        message: mediaFilenameErrorMessage,
      },
    ],
  })
}

export const resolveMediaPath = (root: string, filename: string): string => {
  const safeFilename = assertSafeMediaFilename(filename)
  const resolvedRoot = path.resolve(root)
  const target = path.resolve(resolvedRoot, safeFilename)

  if (!target.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error("Resolved media path escapes expected directory")
  }

  return target
}
