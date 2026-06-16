import { describe, it, expect, vi, beforeEach } from "vitest"

// OBS-21 — togglePageInNav adds/removes a `page`-type entry in a tenant's
// header or footer nav. The page-editor "Include in header/footer nav"
// toggles call it. Authorization is Payload's (SiteSettings.access.update =
// canUpdateSettings + multi-tenant scoping) via overrideAccess:false + user.

vi.mock("@/payload.config", () => ({ default: {} }))

const fakeAuth = vi.fn()
const fakeFind = vi.fn()
const fakeUpdate = vi.fn()
vi.mock("payload", async () => {
  const actual = await vi.importActual<typeof import("payload")>("payload")
  return {
    ...actual,
    getPayload: vi.fn(async () => ({ auth: fakeAuth, find: fakeFind, update: fakeUpdate })),
  }
})
vi.mock("next/headers", () => ({ headers: async () => new Headers() }))

import { togglePageInNav } from "@/lib/actions/togglePageInNav"

beforeEach(() => {
  fakeAuth.mockReset()
  fakeFind.mockReset()
  fakeUpdate.mockReset()
  fakeUpdate.mockResolvedValue({ id: 10 })
  fakeAuth.mockResolvedValue({ user: { id: 1, role: "owner" } })
})

// A SiteSettings row whose navHeader holds a section entry + a page entry
// for page 5, navFooter empty. `id` on rows mimics Payload array-row ids.
const settingsWith = (navHeader: any[], navFooter: any[] = []) => ({
  docs: [{ id: 10, navHeader, navFooter }],
  totalDocs: 1,
})

describe("togglePageInNav", () => {
  it("toggle ON: appends a page entry when the page isn't in the zone", async () => {
    fakeFind.mockResolvedValueOnce(settingsWith([{ id: "r1", type: "section", anchor: "x", label: "X" }]))
    await togglePageInNav(7, 5, "header", true)

    const data = fakeUpdate.mock.calls[0]![0].data
    expect(data.navHeader).toEqual([
      { type: "section", page: null, anchor: "x", url: null, label: "X", external: false },
      { type: "page", page: 5, anchor: null, url: null, label: null, external: false },
    ])
  })

  it("toggle ON: is idempotent / de-dupes when the page is already present (even twice)", async () => {
    fakeFind.mockResolvedValueOnce(
      settingsWith([
        { id: "r1", type: "page", page: 5 },
        { id: "r2", type: "page", page: 5 },
      ]),
    )
    await togglePageInNav(7, 5, "header", true)
    const data = fakeUpdate.mock.calls[0]![0].data
    expect(data.navHeader.filter((e: any) => e.type === "page" && e.page === 5)).toHaveLength(1)
  })

  it("toggle OFF: removes every page entry for that page, keeps the rest", async () => {
    fakeFind.mockResolvedValueOnce(
      settingsWith([
        { id: "r1", type: "page", page: 5 },
        { id: "r2", type: "section", anchor: "a", label: "A" },
        { id: "r3", type: "page", page: 9 },
      ]),
    )
    await togglePageInNav(7, 5, "header", false)
    const data = fakeUpdate.mock.calls[0]![0].data
    expect(data.navHeader).toEqual([
      { type: "section", page: null, anchor: "a", url: null, label: "A", external: false },
      { type: "page", page: 9, anchor: null, url: null, label: null, external: false },
    ])
  })

  it("toggle OFF when the page isn't there is a harmless no-op", async () => {
    fakeFind.mockResolvedValueOnce(settingsWith([{ id: "r1", type: "page", page: 9 }]))
    await togglePageInNav(7, 5, "header", false)
    expect(fakeUpdate.mock.calls[0]![0].data.navHeader).toEqual([
      { type: "page", page: 9, anchor: null, url: null, label: null, external: false },
    ])
  })

  it("targets navFooter for the footer zone", async () => {
    fakeFind.mockResolvedValueOnce(settingsWith([], []))
    await togglePageInNav(7, 5, "footer", true)
    const data = fakeUpdate.mock.calls[0]![0].data
    expect(data.navFooter).toEqual([
      { type: "page", page: 5, anchor: null, url: null, label: null, external: false },
    ])
    expect(data.navHeader).toBeUndefined()
  })

  it("normalises a populated `page` relationship object to its id", async () => {
    fakeFind.mockResolvedValueOnce(settingsWith([{ id: "r1", type: "page", page: { id: 9, slug: "about" } }]))
    await togglePageInNav(7, 5, "header", true)
    const data = fakeUpdate.mock.calls[0]![0].data
    // existing entry's populated page → bare id 9; new entry → 5
    expect(data.navHeader).toEqual([
      { type: "page", page: 9, anchor: null, url: null, label: null, external: false },
      { type: "page", page: 5, anchor: null, url: null, label: null, external: false },
    ])
  })

  it("update runs with overrideAccess:false + user (Payload enforces canUpdateSettings)", async () => {
    fakeFind.mockResolvedValueOnce(settingsWith([]))
    await togglePageInNav(7, 5, "header", true)
    const args = fakeUpdate.mock.calls[0]![0]
    expect(args.collection).toBe("site-settings")
    expect(args.id).toBe(10)
    expect(args.overrideAccess).toBe(false)
    expect(args.user).toEqual({ id: 1, role: "owner" })
  })

  it("rejects an unauthenticated caller", async () => {
    fakeAuth.mockReset()
    fakeAuth.mockResolvedValueOnce({ user: null })
    await expect(togglePageInNav(7, 5, "header", true)).rejects.toThrow(/authentication required/i)
    expect(fakeUpdate).not.toHaveBeenCalled()
  })

  it("rejects when no settings row is accessible for the tenant", async () => {
    fakeFind.mockResolvedValueOnce({ docs: [], totalDocs: 0 })
    await expect(togglePageInNav(7, 5, "header", true)).rejects.toThrow(/no site settings accessible/i)
    expect(fakeUpdate).not.toHaveBeenCalled()
  })

  it("string vs number page id compares correctly", async () => {
    fakeFind.mockResolvedValueOnce(settingsWith([{ id: "r1", type: "page", page: 5 }]))
    await togglePageInNav(7, "5", "header", false)
    expect(fakeUpdate.mock.calls[0]![0].data.navHeader).toEqual([])
  })
})
