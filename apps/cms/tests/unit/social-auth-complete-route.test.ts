import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  issuePayloadSessionCookie: vi.fn(),
}))

vi.mock("@/lib/betterAuth", () => ({
  auth: {
    api: {
      getSession: mocks.getSession,
    },
  },
}))

vi.mock("@/lib/socialAuth/payloadSession", () => ({
  issuePayloadSessionCookie: mocks.issuePayloadSessionCookie,
}))

import { GET } from "@/app/api/siab-auth/complete/route"

const request = (path = "/api/siab-auth/complete") =>
  new Request(`https://admin.ami-care.nl${path}`, {
    headers: {
      host: "admin.ami-care.nl",
      "x-siab-mode": "tenant",
      "x-siab-host": "ami-care.nl",
    },
  })

describe("social auth completion route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("redirects to login when Better Auth has no linked Payload user", async () => {
    mocks.getSession.mockResolvedValueOnce({ user: {} })

    const res = await GET(request())

    expect(res.status).toBe(307)
    expect(res.headers.get("location")).toBe("https://admin.ami-care.nl/login?error=social-unlinked")
    expect(mocks.issuePayloadSessionCookie).not.toHaveBeenCalled()
  })

  it("mints a Payload cookie and preserves a safe next redirect", async () => {
    mocks.getSession.mockResolvedValueOnce({ user: { payloadUserId: "42" } })
    mocks.issuePayloadSessionCookie.mockResolvedValueOnce("payload-token=signed; Path=/; HttpOnly")

    const res = await GET(request("/api/siab-auth/complete?next=/sites"))

    expect(res.status).toBe(307)
    expect(res.headers.get("location")).toBe("https://admin.ami-care.nl/sites")
    expect(res.headers.get("set-cookie")).toBe("payload-token=signed; Path=/; HttpOnly")
    expect(mocks.issuePayloadSessionCookie).toHaveBeenCalledWith("42", expect.any(Request))
  })

  it("rejects unsafe next redirects through the shared validator", async () => {
    mocks.getSession.mockResolvedValueOnce({ user: { payloadUserId: "42" } })
    mocks.issuePayloadSessionCookie.mockResolvedValueOnce("payload-token=signed; Path=/; HttpOnly")

    const res = await GET(request("/api/siab-auth/complete?next=https://evil.example/path"))

    expect(res.headers.get("location")).toBe("https://admin.ami-care.nl/")
  })

  it("redirects to login when the Payload session bridge fails", async () => {
    mocks.getSession.mockResolvedValueOnce({ user: { payloadUserId: "42" } })
    mocks.issuePayloadSessionCookie.mockRejectedValueOnce(new Error("wrong host"))

    const res = await GET(request())

    expect(res.status).toBe(307)
    expect(res.headers.get("location")).toBe("https://admin.ami-care.nl/login?error=social-session")
  })
})
