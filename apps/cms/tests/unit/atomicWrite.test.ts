import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { writeAtomic } from "@/lib/atomicWrite"
import { promises as fs } from "node:fs"
import path from "node:path"
import os from "node:os"

let tmpdir: string
beforeEach(async () => { tmpdir = await fs.mkdtemp(path.join(os.tmpdir(), "siab-")) })
afterEach(async () => { await fs.rm(tmpdir, { recursive: true, force: true }) })

describe("writeAtomic", () => {
  it("writes content to the target path", async () => {
    const target = path.join(tmpdir, "a", "b", "c.json")
    await writeAtomic(target, '{"x":1}')
    expect(await fs.readFile(target, "utf8")).toBe('{"x":1}')
  })

  it("creates parent directories", async () => {
    const target = path.join(tmpdir, "deep/very/deep/file.txt")
    await writeAtomic(target, "ok")
    expect(await fs.readFile(target, "utf8")).toBe("ok")
  })

  it("does not leave .tmp behind on success", async () => {
    const target = path.join(tmpdir, "x.json")
    await writeAtomic(target, "{}")
    const dir = await fs.readdir(tmpdir)
    expect(dir).toEqual(["x.json"])
  })

  // OBS-15: prior to the catch+unlink, a failing rename (or failing
  // writeFile/fsync upstream of it) left `.tmp.<pid>.<ts>` debris in the
  // destination directory.
  it("removes the .tmp file when fs.rename fails (target is a non-empty directory)", async () => {
    const target = path.join(tmpdir, "blocked")
    await fs.mkdir(target)
    await fs.writeFile(path.join(target, "child"), "x")

    let caught: unknown = null
    try {
      await writeAtomic(target, "{}")
    } catch (e) {
      caught = e
    }
    expect(caught, "rename onto non-empty dir must throw").not.toBeNull()

    const remaining = await fs.readdir(tmpdir)
    const debris = remaining.filter((n) => n.includes(".tmp."))
    expect(debris).toEqual([])
  })
})
