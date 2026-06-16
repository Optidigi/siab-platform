import { describe, expect, it, beforeAll } from "vitest"
import { getTestPayload } from "./_helpers"

let payload: Awaited<ReturnType<typeof getTestPayload>>
let tenantWithMenu: number | string
let tenantUnrestricted: number | string

beforeAll(async () => {
  payload = await getTestPayload()

  const ts = Date.now()
  const restricted = await payload.create({
    collection: "tenants",
    data: {
      name: "restricted-blocks",
      slug: `restricted-blocks-${ts}`,
      domain: `restricted-${ts}.test`,
      siteManifest: {
        version: 1,
        inlineMarks: { bold: true, italic: true },
        blockTypes: { paragraph: true, heading: { levels: [2, 3] } },
        blocks: [{ slug: "hero" }, { slug: "richText" }],
      },
    } as any,
    overrideAccess: true,
  })
  tenantWithMenu = restricted.id

  const unrestricted = await payload.create({
    collection: "tenants",
    data: {
      name: "unrestricted-blocks",
      slug: `unrestricted-blocks-${ts}`,
      domain: `unrestricted-${ts}.test`,
    } as any,
    overrideAccess: true,
  })
  tenantUnrestricted = unrestricted.id
}, 30000)

// Inline-variant root: children must be inline nodes (text/link/linebreak),
// NOT a paragraph (which is a block-level node). Mirrors the shape used by
// the existing pageRtValidation integration test for inline headline fields.
const minimalInlineHeadline = {
  t: "root", variant: "inline",
  children: [{ t: "text", v: "Hi" }],
} as const

describe("enforceTenantBlockMenu — integration", () => {
  it("allows an in-menu block on a restricted tenant", async () => {
    const result = await payload.create({
      collection: "pages",
      data: {
        title: "p1", slug: "p1", tenant: tenantWithMenu,
        blocks: [{ blockType: "hero", headline: minimalInlineHeadline }],
      } as any,
      overrideAccess: true,
    })
    expect(result.id).toBeTruthy()
  })

  it("rejects an out-of-menu block on a restricted tenant", async () => {
    await expect(
      payload.create({
        collection: "pages",
        data: {
          title: "p2", slug: "p2", tenant: tenantWithMenu,
          blocks: [{
            blockType: "cta",
            headline: minimalInlineHeadline,
            primary: { label: "Go", href: "/" },
          }],
        } as any,
        overrideAccess: true,
      }),
    ).rejects.toThrow(/cta \(index 0\)/)
  })

  it("allows any block on an unrestricted tenant (no blocks[] in manifest)", async () => {
    const result = await payload.create({
      collection: "pages",
      data: {
        title: "p3", slug: "p3", tenant: tenantUnrestricted,
        blocks: [{
          blockType: "cta",
          headline: minimalInlineHeadline,
          primary: { label: "Go", href: "/" },
        }],
      } as any,
      overrideAccess: true,
    })
    expect(result.id).toBeTruthy()
  })
})
