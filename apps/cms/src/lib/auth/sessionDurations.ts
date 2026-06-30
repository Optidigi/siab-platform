const DAYS = 24 * 60 * 60

const readPositiveInt = (name: string, fallback: number): number => {
  const value = process.env[name]
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export const CMS_SESSION_EXPIRES_IN_SECONDS = readPositiveInt(
  "SIAB_CMS_SESSION_EXPIRES_IN_SECONDS",
  60 * DAYS,
)

export const PREVIEW_SESSION_EXPIRES_IN_SECONDS = readPositiveInt(
  "SIAB_PREVIEW_SESSION_EXPIRES_IN_SECONDS",
  60 * DAYS,
)

export const SESSION_UPDATE_AGE_SECONDS = readPositiveInt(
  "SIAB_SESSION_UPDATE_AGE_SECONDS",
  DAYS,
)
