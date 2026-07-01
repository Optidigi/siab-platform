import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/email/sendEmail", () => ({
  sendEmail: vi.fn(),
}))

vi.mock("@/lib/preview/previewAccess", () => ({
  hasActivePreviewGrant: vi.fn(),
}))

describe("preview Better Auth host configuration", () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = {
      ...originalEnv,
      DATABASE_URI: "postgres://payload:payload@localhost:5432/payload",
      PAYLOAD_SECRET: "test-secret",
      NODE_ENV: "production",
    }
  })

  it("uses only the public preview host in production", async () => {
    const { getPreviewBetterAuthBaseURL, getPreviewTrustedOrigins } = await import("@/lib/preview/betterAuth")

    expect(getPreviewBetterAuthBaseURL()).toEqual({
      allowedHosts: ["preview.siteinabox.nl"],
      protocol: "https",
      fallback: "https://preview.siteinabox.nl",
    })
    expect(getPreviewTrustedOrigins()).toEqual(["https://preview.siteinabox.nl"])
  })

  it("adds loopback preview hosts only in development", async () => {
    vi.stubEnv("NODE_ENV", "development")
    const { getPreviewBetterAuthBaseURL, getPreviewTrustedOrigins } = await import("@/lib/preview/betterAuth")

    expect(getPreviewBetterAuthBaseURL()).toEqual({
      allowedHosts: ["preview.siteinabox.nl", "localhost:*", "127.0.0.1:*"],
      protocol: "http",
      fallback: "https://preview.siteinabox.nl",
    })
    expect(getPreviewTrustedOrigins()).toEqual([
      "https://preview.siteinabox.nl",
      "http://localhost:*",
      "http://127.0.0.1:*",
    ])
  })
})
