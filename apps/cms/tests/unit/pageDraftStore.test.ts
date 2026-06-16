import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import {
  deletePageEditorDraft,
  readPageEditorDraft,
  writePageEditorDraft,
  type PageEditorDraft,
} from "@/lib/editor/pageDraftStore"

function installLocalStorageStub() {
  const store = new Map<string, string>()
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value) },
    removeItem: (key: string) => { store.delete(key) },
  })
}

describe("pageDraftStore", () => {
  beforeEach(() => {
    vi.stubGlobal("indexedDB", undefined)
    installLocalStorageStub()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test("falls back to localStorage when IndexedDB is unavailable", async () => {
    const draft: PageEditorDraft = {
      version: 1,
      key: "page:tenant:1",
      savedAt: 123,
      baselineUpdatedAt: "2026-05-22T00:00:00.000Z",
      formValues: { title: "Recovered", slug: "recovered", status: "draft", blocks: [], seo: {} },
      theme: { palette: "test" },
    }

    await writePageEditorDraft(draft)
    await expect(readPageEditorDraft(draft.key)).resolves.toEqual(draft)
  })

  test("deletes fallback draft entries", async () => {
    const draft: PageEditorDraft = {
      version: 1,
      key: "page:tenant:2",
      savedAt: 456,
      baselineUpdatedAt: null,
      formValues: { title: "Discard", slug: "discard", status: "draft", blocks: [], seo: {} },
      theme: null,
    }

    await writePageEditorDraft(draft)
    await deletePageEditorDraft(draft.key)
    await expect(readPageEditorDraft(draft.key)).resolves.toBeNull()
  })
})
