import assert from "node:assert/strict"
import { mkdir, mkdtemp, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import test from "node:test"

import {
  createAmblastLegacyNotFoundResponse,
  createAmblastLegacyResponse,
  isAmblastLegacyHost,
  resolveAmblastLegacyFile,
} from "./legacy-response.js"

test("matches only configured Amblast legacy hosts", () => {
  delete process.env.AMBLAST_LEGACY_HOSTS

  assert.equal(isAmblastLegacyHost("amblast.optidigi.nl"), true)
  assert.equal(isAmblastLegacyHost("example.test"), false)
})

test("serves exact legacy page files and rejects traversal", async () => {
  const distDir = await mkdtemp(join(tmpdir(), "amblast-legacy-"))
  process.env.AMBLAST_LEGACY_DIST_DIR = distDir

  await mkdir(join(distDir, "over-ons"), { recursive: true })
  await writeFile(join(distDir, "over-ons/index.html"), "<!DOCTYPE html><html><body class=\"amb-page\"></body></html>")

  const file = await resolveAmblastLegacyFile("/over-ons/")
  assert.equal(file, join(distDir, "over-ons/index.html"))

  const response = await createAmblastLegacyResponse("/over-ons")
  assert.equal(response?.headers.get("content-type"), "text/html; charset=utf-8")
  assert.equal(await response?.text(), "<!DOCTYPE html><html><body class=\"amb-page\"></body></html>")

  assert.equal(await resolveAmblastLegacyFile("/../package.json"), null)
  assert.equal(await resolveAmblastLegacyFile("/%E0%A4%A"), null)
})

test("preserves legacy WordPress redirects", async () => {
  const redirects = [
    ["/portfolio-1", "/portfolio"],
    ["/portfolio-1/", "/portfolio"],
    ["/contact-pagina", "/contact"],
    ["/contact-pagina/", "/contact"],
    ["/our-team", "/over-ons"],
    ["/our-team/", "/over-ons"],
  ]

  for (const [source, destination] of redirects) {
    const response = await createAmblastLegacyResponse(source)
    assert.equal(response?.status, 301)
    assert.equal(response?.headers.get("location"), destination)
  }
})

test("returns a legacy 404 without falling through to the generic renderer", async () => {
  const distDir = await mkdtemp(join(tmpdir(), "amblast-legacy-"))
  process.env.AMBLAST_LEGACY_DIST_DIR = distDir

  await writeFile(join(distDir, "404.html"), "<!DOCTYPE html><html><body class=\"amb-404\"></body></html>")

  const response = await createAmblastLegacyNotFoundResponse()
  assert.equal(response.status, 404)
  assert.equal(response.headers.get("content-type"), "text/html; charset=utf-8")
  assert.equal(await response.text(), "<!DOCTYPE html><html><body class=\"amb-404\"></body></html>")
})
