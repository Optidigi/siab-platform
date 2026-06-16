import type { SocialProvider } from "better-auth/social-providers"

export const SOCIAL_AUTH_PROVIDERS = ["google", "microsoft", "apple"] as const

export type SocialAuthProvider = Extract<SocialProvider, (typeof SOCIAL_AUTH_PROVIDERS)[number]>

export const SOCIAL_AUTH_PROVIDER_LABELS: Record<SocialAuthProvider, string> = {
  google: "Google",
  microsoft: "Microsoft",
  apple: "Apple",
}

const hasEnvPair = (id: string, secret: string): boolean =>
  Boolean(process.env[id]?.trim() && process.env[secret]?.trim())

export const getEnabledSocialAuthProviders = (): SocialAuthProvider[] =>
  SOCIAL_AUTH_PROVIDERS.filter((provider) => {
    if (provider === "google") return hasEnvPair("GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET")
    if (provider === "microsoft") return hasEnvPair("MICROSOFT_CLIENT_ID", "MICROSOFT_CLIENT_SECRET")
    return hasEnvPair("APPLE_CLIENT_ID", "APPLE_CLIENT_SECRET")
  })
