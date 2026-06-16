import { describe, expect, it, vi } from "vitest"
import { fetchTenantMedia, resolveMediaTenantId } from "@/components/media/clientMedia"

const jsonResponse = (body: unknown, ok = true) =>
  ({
    ok,
    json: async () => body,
  }) as Response

describe("client media helpers", () => {
  it("resolves a tenant member's populated tenant id", async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse({ user: { role: "owner", tenants: [{ tenant: { id: 42 } }] } }),
    ) as unknown as typeof fetch

    await expect(resolveMediaTenantId({ fetcher })).resolves.toBe(42)
  })

  it("resolves a tenant member's raw tenant id", async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse({ user: { role: "editor", tenants: [{ tenant: "tenant-a" }] } }),
    ) as unknown as typeof fetch

    await expect(resolveMediaTenantId({ fetcher })).resolves.toBe("tenant-a")
  })

  it("resolves a selected-site super-admin tenant from the current pathname", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ user: { role: "super-admin", tenants: [] } }))
      .mockResolvedValueOnce(jsonResponse({ docs: [{ id: "site-123" }] })) as unknown as typeof fetch

    await expect(
      resolveMediaTenantId({ fetcher, pathname: "/sites/ami-care/pages/9" }),
    ).resolves.toBe("site-123")
    expect(fetcher).toHaveBeenLastCalledWith("/api/tenants?where[slug][equals]=ami-care&limit=1")
  })

  it("does not guess a super-admin tenant outside a selected-site route", async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse({ user: { role: "super-admin", tenants: [] } }),
    ) as unknown as typeof fetch

    await expect(resolveMediaTenantId({ fetcher, pathname: "/media" })).resolves.toBeNull()
  })

  it("fetches tenant media with an encoded tenant filter", async () => {
    const docs = [{ id: 1, filename: "hero.jpg" }]
    const fetcher = vi.fn(async () => jsonResponse({ docs })) as unknown as typeof fetch

    await expect(fetchTenantMedia("tenant 1", fetcher)).resolves.toEqual(docs)
    expect(fetcher).toHaveBeenCalledWith(
      "/api/media?where[tenant][equals]=tenant%201&limit=200&sort=-updatedAt",
    )
  })

  it("returns an empty list when media loading fails", async () => {
    const fetcher = vi.fn(async () => jsonResponse({}, false)) as unknown as typeof fetch

    await expect(fetchTenantMedia(7, fetcher)).resolves.toEqual([])
  })
})
