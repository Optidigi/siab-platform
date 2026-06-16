import { describe, expect, it, vi } from "vitest"

const { dashMock } = vi.hoisted(() => ({
  dashMock: vi.fn((options: unknown) => ({ id: "dash", options })),
}))

vi.mock("@better-auth/infra", () => ({
  dash: dashMock,
}))

import { getBetterAuthInfraPlugins } from "@/lib/betterAuthInfra"

describe("Better Auth Infrastructure plugin configuration", () => {
  it("does not enable Infrastructure without an API key", () => {
    expect(getBetterAuthInfraPlugins({})).toEqual([])
    expect(getBetterAuthInfraPlugins({ BETTER_AUTH_API_KEY: "   " })).toEqual([])
    expect(dashMock).not.toHaveBeenCalled()
  })

  it("enables only the dashboard/audit bridge when an API key is configured", () => {
    const plugins = getBetterAuthInfraPlugins({
      BETTER_AUTH_API_KEY: "ba_test_key",
      BETTER_AUTH_API_URL: " https://dash.example.test ",
      BETTER_AUTH_KV_URL: " https://kv.example.test ",
    })

    expect(plugins).toEqual([
      {
        id: "dash",
        options: {
          apiKey: "ba_test_key",
          apiUrl: "https://dash.example.test",
          kvUrl: "https://kv.example.test",
        },
      },
    ])
    expect(dashMock).toHaveBeenCalledWith({
      apiKey: "ba_test_key",
      apiUrl: "https://dash.example.test",
      kvUrl: "https://kv.example.test",
    })
  })

  it("uses Better Auth hosted defaults when optional URLs are blank", () => {
    getBetterAuthInfraPlugins({
      BETTER_AUTH_API_KEY: "ba_test_key",
      BETTER_AUTH_API_URL: "",
      BETTER_AUTH_KV_URL: " ",
    })

    expect(dashMock).toHaveBeenLastCalledWith({ apiKey: "ba_test_key" })
  })
})
