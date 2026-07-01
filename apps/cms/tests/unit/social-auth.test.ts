import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/payload.config", () => ({ default: {} }))

const fakeFind = vi.fn()

vi.mock("payload", async () => {
  const actual = await vi.importActual<typeof import("payload")>("payload")
  return {
    ...actual,
    getPayload: vi.fn(async () => ({ find: fakeFind })),
  }
})

import { getEnabledSocialAuthProviders } from "@/lib/socialAuth/providers"
import { getBetterAuthBaseURL, getTrustedSocialAuthOrigins, isAllowedSocialAuthHost } from "@/lib/socialAuth/hosts"
import { resolvePayloadUserForMagicLink, resolvePayloadUserForSocialSignup } from "@/lib/socialAuth/payloadUser"
import { canonicalizeCmsMagicLinkUrl } from "@/lib/auth/cmsMagicLinkUrl"
import { canonicalizeMagicLinkUrl } from "@/lib/auth/magicLinkUrl"

describe("social auth provider configuration", () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
    delete process.env.GOOGLE_CLIENT_ID
    delete process.env.GOOGLE_CLIENT_SECRET
    delete process.env.MICROSOFT_CLIENT_ID
    delete process.env.MICROSOFT_CLIENT_SECRET
    delete process.env.APPLE_CLIENT_ID
    delete process.env.APPLE_CLIENT_SECRET
  })

  it("enables only providers with a client id and secret", () => {
    process.env.GOOGLE_CLIENT_ID = "google-id"
    process.env.GOOGLE_CLIENT_SECRET = "google-secret"
    process.env.APPLE_CLIENT_ID = "apple-id"

    expect(getEnabledSocialAuthProviders()).toEqual(["google"])
  })
})

describe("Payload social auth user resolution", () => {
  beforeEach(() => {
    fakeFind.mockReset()
  })

  it("requires a verified provider email", async () => {
    await expect(
      resolvePayloadUserForSocialSignup({ email: "owner@example.com", emailVerified: false }),
    ).rejects.toThrow("verified email")
    expect(fakeFind).not.toHaveBeenCalled()
  })

  it("resolves exactly one invited Payload user by normalized email", async () => {
    const payloadUser = {
      id: 42,
      email: "owner@example.com",
      role: "owner",
      tenants: [{ tenant: 1 }],
    }
    fakeFind.mockResolvedValueOnce({ totalDocs: 1, docs: [payloadUser] })

    await expect(
      resolvePayloadUserForSocialSignup({ email: " OWNER@EXAMPLE.COM ", emailVerified: true }),
    ).resolves.toBe(payloadUser)

    expect(fakeFind).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: "users",
        where: { email: { equals: "owner@example.com" } },
        limit: 2,
        depth: 0,
        overrideAccess: true,
      }),
    )
  })

  it("rejects missing or ambiguous Payload users", async () => {
    fakeFind.mockResolvedValueOnce({ totalDocs: 2, docs: [{}, {}] })

    await expect(
      resolvePayloadUserForSocialSignup({ email: "owner@example.com", emailVerified: true }),
    ).rejects.toThrow("No invited CMS user")
  })

  it("rejects users that violate role/tenant invariants", async () => {
    fakeFind.mockResolvedValueOnce({
      totalDocs: 1,
      docs: [{ id: 1, email: "owner@example.com", role: "owner", tenants: [] }],
    })

    await expect(
      resolvePayloadUserForSocialSignup({ email: "owner@example.com", emailVerified: true }),
    ).rejects.toThrow("not eligible")
  })

  it("allows magic links only for existing eligible Payload users", async () => {
    const payloadUser = {
      id: 7,
      email: "editor@example.com",
      role: "editor",
      tenants: [{ tenant: 1 }],
    }
    fakeFind.mockResolvedValueOnce({ totalDocs: 1, docs: [payloadUser] })

    await expect(resolvePayloadUserForMagicLink(" EDITOR@EXAMPLE.COM ")).resolves.toBe(payloadUser)
    expect(fakeFind).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: "users",
        where: { email: { equals: "editor@example.com" } },
      }),
    )
  })
})

describe("social auth host validation", () => {
  beforeEach(() => {
    fakeFind.mockReset()
    delete process.env.BETTER_AUTH_ALLOWED_HOSTS
    delete process.env.BETTER_AUTH_URL
    delete process.env.SITE_URL
    process.env.NEXT_PUBLIC_SUPER_ADMIN_DOMAIN = "siteinabox.nl"
  })

  it("allows the configured super-admin admin host", async () => {
    const req = new Request("https://admin.siteinabox.nl/api/auth/sign-in/social", {
      headers: { host: "admin.siteinabox.nl" },
    })

    await expect(isAllowedSocialAuthHost(req)).resolves.toBe(true)
    expect(fakeFind).not.toHaveBeenCalled()
  })

  it("configures Better Auth dynamic base URL for generated admin hosts", () => {
    process.env.BETTER_AUTH_ALLOWED_HOSTS = "preview.example.com, admin.extra.test"
    process.env.SITE_URL = "https://admin.siteinabox.nl"

    expect(getBetterAuthBaseURL()).toEqual({
      allowedHosts: ["admin.*", "preview.example.com", "admin.extra.test"],
      protocol: "https",
      fallback: "https://admin.siteinabox.nl",
    })
  })

  it("allows localhost dynamic auth bases only in development", () => {
    const originalNodeEnv = process.env.NODE_ENV
    vi.stubEnv("NODE_ENV", "development")
    expect(getBetterAuthBaseURL()).toEqual({
      allowedHosts: ["admin.*", "localhost:*", "127.0.0.1:*"],
      protocol: "http",
    })
    vi.stubEnv("NODE_ENV", originalNodeEnv)
  })

  it("allows generated tenant admin hosts from Payload tenant domains", async () => {
    fakeFind
      .mockResolvedValueOnce({ docs: [{ id: 7, domain: "ami-care.nl", status: "active" }] })
      .mockResolvedValueOnce({ docs: [{ id: 7, domain: "ami-care.nl", status: "active" }] })
    const req = new Request("https://admin.ami-care.nl/api/auth/sign-in/social", {
      headers: { host: "admin.ami-care.nl" },
    })

    await expect(isAllowedSocialAuthHost(req)).resolves.toBe(true)
    await expect(getTrustedSocialAuthOrigins(req)).resolves.toEqual(["https://admin.ami-care.nl"])
    expect(fakeFind).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: "tenants",
        where: { domain: { equals: "ami-care.nl" } },
      }),
    )
  })

  it("keeps tenant admin origins first while also trusting the canonical CMS fallback", async () => {
    process.env.SITE_URL = "https://admin.siteinabox.nl"
    fakeFind.mockResolvedValueOnce({ docs: [{ id: 7, domain: "ami-care.nl", status: "active" }] })
    const req = new Request("https://admin.ami-care.nl/api/auth/sign-in/magic-link", {
      headers: { host: "admin.ami-care.nl" },
    })

    await expect(getTrustedSocialAuthOrigins(req)).resolves.toEqual([
      "https://admin.ami-care.nl",
      "https://admin.siteinabox.nl",
    ])
  })

  it("rejects unknown tenant admin hosts", async () => {
    fakeFind.mockResolvedValueOnce({ docs: [] })
    const req = new Request("https://admin.unknown.example/api/auth/sign-in/social", {
      headers: { host: "admin.unknown.example" },
    })

    await expect(isAllowedSocialAuthHost(req)).resolves.toBe(false)
  })

  it("rejects suspended tenant admin hosts", async () => {
    fakeFind.mockResolvedValueOnce({
      docs: [{ id: 7, domain: "ami-care.nl", status: "suspended" }],
    })
    const req = new Request("https://admin.ami-care.nl/api/auth/sign-in/social", {
      headers: { host: "admin.ami-care.nl" },
    })

    await expect(isAllowedSocialAuthHost(req)).resolves.toBe(false)
  })

  it("trusts the configured canonical Better Auth origin without a request", async () => {
    process.env.BETTER_AUTH_URL = "https://admin.siteinabox.nl/"

    await expect(getTrustedSocialAuthOrigins()).resolves.toEqual(["https://admin.siteinabox.nl"])
  })

  it("rewrites CMS magic links from internal container origins to the trusted request admin host", async () => {
    process.env.SITE_URL = "https://admin.siteinabox.nl"
    const loginUrl = await canonicalizeCmsMagicLinkUrl(
      "http://0.0.0.0:3000/api/auth/magic-link/verify?token=test-token&callbackURL=http%3A%2F%2F0.0.0.0%3A3000%2F",
      {
        headers: new Headers({
          host: "0.0.0.0:3000",
          "x-forwarded-host": "admin.siteinabox.nl",
          "x-forwarded-proto": "https",
        }),
      },
    )

    const parsed = new URL(loginUrl)
    expect(parsed.origin).toBe("https://admin.siteinabox.nl")
    expect(parsed.pathname).toBe("/api/auth/magic-link/verify")
    expect(parsed.searchParams.get("token")).toBe("test-token")
    expect(parsed.searchParams.get("callbackURL")).toBe("/")
  })

  it("rewrites tenant CMS magic links to the Payload-approved tenant admin host", async () => {
    fakeFind.mockResolvedValueOnce({ docs: [{ id: 7, domain: "ami-care.nl", status: "active" }] })

    const loginUrl = await canonicalizeCmsMagicLinkUrl(
      "http://0.0.0.0:3000/api/auth/magic-link/verify?token=test-token&callbackURL=%2Fapi%2Fsiab-auth%2Fcomplete%3Fnext%3D%252F",
      {
        headers: {
          host: "0.0.0.0:3000",
          "x-forwarded-host": "admin.ami-care.nl",
          "x-forwarded-proto": "https",
        },
      },
    )

    const parsed = new URL(loginUrl)
    expect(parsed.origin).toBe("https://admin.ami-care.nl")
    expect(parsed.searchParams.get("callbackURL")).toBe("/api/siab-auth/complete?next=%2F")
  })

  it("keeps magic-link callback URLs relative to the canonical origin", () => {
    const loginUrl = canonicalizeMagicLinkUrl(
      "https://admin.siteinabox.nl/api/auth/magic-link/verify?token=test-token&callbackURL=https%3A%2F%2Fevil.example%2F",
      "https://admin.siteinabox.nl",
    )

    expect(new URL(loginUrl).searchParams.get("callbackURL")).toBe("/")
  })
})
