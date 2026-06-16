import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import path from "node:path"

const read = (relativePath: string) =>
  readFileSync(path.resolve(process.cwd(), relativePath), "utf8")

describe("FE-23 tenant manifest repo sync UI", () => {
  it("loads a repo manifest into the Tenant edit form without auto-saving it", () => {
    const source = read("src/components/forms/TenantEditForm.tsx")

    expect(source).toContain('import { fetchTenantManifestFromRepo } from "@/lib/actions/fetchTenantManifestFromRepo"')
    expect(source).toContain("const result = await fetchTenantManifestFromRepo(tenant.id)")
    expect(source).toContain('form.setValue("siteManifest"')
    expect(source).toContain("shouldDirty: true")
    expect(source).toContain('t("syncFromRepo")')
    expect(read("src/locales/en.json")).toContain('"syncFromRepo": "Sync from repo"')
  })
})
