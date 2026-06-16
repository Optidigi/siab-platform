import { dash } from "@better-auth/infra"

type DashPlugin = ReturnType<typeof dash>
type BetterAuthInfraEnv = { [key: string]: string | undefined }

const cleanEnv = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

export function getBetterAuthInfraPlugins(env: BetterAuthInfraEnv = process.env): DashPlugin[] {
  const apiKey = cleanEnv(env.BETTER_AUTH_API_KEY)
  if (!apiKey) return []

  return [
    dash({
      apiKey,
      ...(cleanEnv(env.BETTER_AUTH_API_URL) ? { apiUrl: cleanEnv(env.BETTER_AUTH_API_URL) } : {}),
      ...(cleanEnv(env.BETTER_AUTH_KV_URL) ? { kvUrl: cleanEnv(env.BETTER_AUTH_KV_URL) } : {}),
    }),
  ]
}
