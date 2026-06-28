import { describe, expect, it } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import {
  buildStaticPlan,
  parseArgs,
} from "../../scripts/canonicalize-production-tenants.mjs"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const scriptPath = path.resolve(__dirname, "../../scripts/canonicalize-production-tenants.mjs")

describe("canonicalize-production-tenants ops script", () => {
  it("defaults to dry-run without a database URI", () => {
    const options = parseArgs([], {} as NodeJS.ProcessEnv)

    expect(options.apply).toBe(false)
    expect(options.backupConfirmed).toBe(false)
    expect(options.databaseUri).toBe("")
  })

  it("requires an explicit apply flag before mutation mode", () => {
    const options = parseArgs(["--apply", "--backup-confirmed"], {
      DATABASE_URI: "postgres://payload:payload@localhost:5432/payload",
    } as unknown as NodeJS.ProcessEnv)

    expect(options.apply).toBe(true)
    expect(options.backupConfirmed).toBe(true)
    expect(options.databaseUri).toContain("localhost")
  })

  it("documents backup, create/remap/delete, sequence reset, and non-destructive media copies", () => {
    const plan = buildStaticPlan({ retireStagingDuplicates: true, dataDir: "/srv/data/saas/siab-payload/tenants" })

    expect(plan).toContain("pg_dump")
    expect(plan).toContain("copy tenant 7 to tenant 1")
    expect(plan).toContain("remap tenant FKs")
    expect(plan).toContain("delete source tenants 7 and 10")
    expect(plan).toContain("reset tenants_id_seq")
    expect(plan).toContain("copy /srv/data/saas/siab-payload/tenants/7 -> /srv/data/saas/siab-payload/tenants/1")
    expect(plan).toContain("never delete old tenant media directories")
  })

  it("does not embed production host mutation commands", () => {
    const source = fs.readFileSync(scriptPath, "utf8")

    expect(source).not.toMatch(/\bssh\b/)
    expect(source).not.toMatch(/\bscp\b/)
    expect(source).not.toMatch(/\bpsql\s+/)
    expect(source).not.toMatch(/docker\s+exec/)
    expect(source).not.toMatch(/podman\s+exec/)
    expect(source).not.toMatch(/DELETE\s+FROM\s+\/srv/)
  })
})
