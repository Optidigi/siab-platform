import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { getTestPayload } from "./_helpers"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

let payload: Awaited<ReturnType<typeof getTestPayload>>
let tenantId: string | number
let pageId: string | number

const uniq = `${Date.now()}-${Math.floor(Math.random() * 100000)}`

beforeAll(async () => {
  payload = await getTestPayload()
  const t = await payload.create({
    collection: "tenants",
    data: {
      name: "AmiCare Integration",
      slug: `amicare-it-${uniq}`,
      domain: `amicare-it-${uniq}.test`,
      siteManifest: {
        version: 1,
        inlineMarks: { bold: true, italic: true },
        colorTokens: [{ id: "accent", label: "Accent", cssVar: "--color-accent" }],
        blockTypes: { paragraph: true, heading: { levels: [2, 3] }, bulletList: true, orderedList: true, blockquote: true, divider: true },
        themedNodes: [{ id: "eyebrow", label: "Eyebrow", fields: [{ name: "text", type: "text", required: true }] }],
      },
    } as any,
    overrideAccess: true,
  })
  tenantId = (t as any).id

  // Since F8 converted body to jsonb, we can't store plain HTML string in the DB.
  // We test mapper + manifest loader integration: create a page to exercise the
  // tenant FK, then drive mapper logic directly.
  const p = await payload.create({
    collection: "pages",
    data: {
      title: "Index",
      slug: `index-${uniq}`,
      status: "published",
      tenant: tenantId,
      blocks: [],
    } as any,
    overrideAccess: true,
  })
  pageId = (p as any).id
}, 30000)

afterAll(async () => {
  if (pageId) await payload.delete({ collection: "pages", id: pageId as any, overrideAccess: true })
  if (tenantId) await payload.delete({ collection: "tenants", id: tenantId as any, overrideAccess: true })
})

describe("migrate-richtext-v2 — ami-care snapshot", () => {
  it("converts the captured prod HTML to the expected RtNode tree", async () => {
    const { mapHtmlToRt } = await import("@/lib/richText/mapper")
    const { eyebrowMatcher } = await import("@/lib/richText/themedMatchers/amicare/eyebrow")
    const { loadTenantManifest } = await import("@/lib/richText/loadManifest")
    const expected = JSON.parse(readFileSync(resolve(__dirname, "../fixtures/richtext/ami-care-live-snapshot.expected.json"), "utf-8"))
    const html = readFileSync(resolve(__dirname, "../fixtures/richtext/ami-care-live-snapshot.html"), "utf-8")
    const manifest = await loadTenantManifest(tenantId)
    const rt = mapHtmlToRt(html, { variant: "block", manifest, themedMatchers: [eyebrowMatcher] })
    expect(rt).toEqual(expected)
  })
})
