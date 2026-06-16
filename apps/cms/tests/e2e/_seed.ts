import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"

type E2ESeed = {
  superAdmin: { email: string; password: string }
  localAdmin: { email: string; password: string }
  audit: {
    slug: string
    name: string
    tenantId: number | string
    pageId: number | string
    pageUrl: string
    secondaryPageId: number | string
    secondaryPageUrl: string
    siteSettingsId: number | string
    mediaId?: number | string | null
  }
}

const SEED_PATH = resolve(process.cwd(), "test-results", "e2e-seed.json")
const SUPER_ADMIN = { email: "e2e-sa@test.local", password: "e2e-test-1234" }
const LOCAL_ADMIN = { email: "admin@local.test", password: "LocalTest!1234" }
const AUDIT_SLUG = "audit-test"
const AUDIT_NAME = "Audit Test Tenant"

const text = (v: string, marks?: Array<"bold" | "italic">) => ({ t: "text" as const, v, ...(marks ? { marks } : {}) })
const inline = (...children: unknown[]) => ({ t: "root" as const, variant: "inline" as const, children })
const block = (...children: unknown[]) => ({ t: "root" as const, variant: "block" as const, children })
const para = (...children: unknown[]) => ({ t: "paragraph" as const, children })

const auditManifest = {
  version: 1,
  inlineMarks: { bold: true, italic: true },
  colorTokens: [{ id: "accent", label: "Accent", cssVar: "--color-accent" }],
  fontFamilies: [
    { id: "title", label: "Title", cssVar: "--font-title" },
    { id: "heading", label: "Heading", cssVar: "--font-heading" },
    { id: "text", label: "Text", cssVar: "--font-text" },
  ],
  blockTypes: {
    paragraph: true,
    heading: { levels: [2, 3] },
    bulletList: true,
    orderedList: true,
    blockquote: true,
    divider: true,
  },
  themedNodes: [],
  blocks: [
    { slug: "hero", label: "Hero", defaultAnchor: "top" },
    { slug: "featureList", label: "Feature list", defaultAnchor: "features" },
    { slug: "richText", label: "Rich text", defaultAnchor: "about" },
    { slug: "cta", label: "CTA", defaultAnchor: "contact" },
    { slug: "contactSection", label: "Contact", defaultAnchor: "contact" },
    { slug: "faq", label: "FAQ" },
    { slug: "testimonials", label: "Testimonials" },
  ],
  footer: {
    columnCounts: [2, 3, 4],
    defaultColumnCount: 3,
    items: [
      { type: "brand", label: "Brand" },
      { type: "links", label: "Links" },
      { type: "text", label: "Text" },
      { type: "contact", label: "Contact" },
    ],
  },
}

async function getPayloadForSeed() {
  process.env.PAYLOAD_DISABLE_JOBS_AUTORUN ||= "1"
  await import("dotenv/config")
  const [{ getPayload }, configModule] = await Promise.all([
    import("payload"),
    import("../../src/payload.config"),
  ])
  return getPayload({ config: configModule.default })
}

function writeSeed(seed: E2ESeed) {
  mkdirSync(dirname(SEED_PATH), { recursive: true })
  writeFileSync(SEED_PATH, `${JSON.stringify(seed, null, 2)}\n`)
}

export function readE2ESeed(): E2ESeed {
  if (!existsSync(SEED_PATH)) {
    throw new Error(`E2E seed metadata is missing at ${SEED_PATH}. Run Playwright with global setup enabled.`)
  }
  return JSON.parse(readFileSync(SEED_PATH, "utf8")) as E2ESeed
}

async function ensureSuperAdmin(payload: Awaited<ReturnType<typeof getPayloadForSeed>>, user: { email: string; password: string }, name: string) {
  const existing = await payload.find({
    collection: "users",
    where: { email: { equals: user.email } },
    limit: 1,
    overrideAccess: true,
  })

  if (existing.docs[0]) {
    await payload.update({
      collection: "users",
      id: (existing.docs[0] as any).id,
      data: { name, password: user.password, role: "super-admin" } as any,
      overrideAccess: true,
      user: existing.docs[0] as any,
    })
    return
  }

  await payload.create({
    collection: "users",
    data: { email: user.email, password: user.password, name, role: "super-admin" } as any,
    overrideAccess: true,
  })
}

async function ensureTenantUser(
  payload: Awaited<ReturnType<typeof getPayloadForSeed>>,
  tenantId: number | string,
  role: "owner" | "editor" | "viewer",
) {
  const email = `${role}.audit@test.local`
  const existing = await payload.find({
    collection: "users",
    where: { email: { equals: email } },
    limit: 1,
    overrideAccess: true,
  })
  const data = {
    email,
    name: `Audit ${role}`,
    role,
    tenants: [{ tenant: tenantId }],
  }
  if (existing.docs[0]) {
    await payload.update({
      collection: "users",
      id: (existing.docs[0] as any).id,
      data: { name: data.name, role, tenants: data.tenants } as any,
      overrideAccess: true,
    })
    return
  }
  await payload.create({
    collection: "users",
    data: { ...data, password: "e2e-test-1234" } as any,
    overrideAccess: true,
  })
}

async function upsertTenant(payload: Awaited<ReturnType<typeof getPayloadForSeed>>) {
  const existing = await payload.find({
    collection: "tenants",
    where: { slug: { equals: AUDIT_SLUG } },
    limit: 1,
    overrideAccess: true,
  })

  if (existing.docs[0]) {
    return payload.update({
      collection: "tenants",
      id: (existing.docs[0] as any).id,
      data: {
        name: AUDIT_NAME,
        slug: AUDIT_SLUG,
        domain: "audit-test.localhost",
        status: "active",
        siteManifest: auditManifest,
      } as any,
      overrideAccess: true,
    })
  }

  return payload.create({
    collection: "tenants",
    data: {
      name: AUDIT_NAME,
      slug: AUDIT_SLUG,
      domain: "audit-test.localhost",
      status: "active",
      siteManifest: auditManifest,
    } as any,
    overrideAccess: true,
  })
}

async function upsertPage(
  payload: Awaited<ReturnType<typeof getPayloadForSeed>>,
  tenantId: number | string,
  slug: string,
  data: Record<string, unknown>,
) {
  const existing = await payload.find({
    collection: "pages",
    where: { and: [{ tenant: { equals: tenantId } }, { slug: { equals: slug } }] },
    limit: 1,
    overrideAccess: true,
  })

  if (existing.docs[0]) {
    return payload.update({
      collection: "pages",
      id: (existing.docs[0] as any).id,
      data: { ...data, slug, tenant: tenantId } as any,
      overrideAccess: true,
    })
  }

  return payload.create({
    collection: "pages",
    data: { ...data, slug, tenant: tenantId } as any,
    overrideAccess: true,
  })
}

async function upsertSiteSettings(
  payload: Awaited<ReturnType<typeof getPayloadForSeed>>,
  tenantId: number | string,
  homePageId: number | string,
) {
  const existing = await payload.find({
    collection: "site-settings",
    where: { tenant: { equals: tenantId } } as any,
    limit: 1,
    overrideAccess: true,
  })

  const data = {
    tenant: tenantId,
    siteName: AUDIT_NAME,
    siteUrl: "https://audit-test.localhost",
    description: "Seeded E2E site",
    contactEmail: "hello@audit-test.localhost",
    branding: { primaryColor: "#2563eb" },
    chrome: {
      footer: {
        tagline: "Seeded footer text",
        copyright: "Audit Test",
        columns: [
          { type: "brand", label: "About", text: "Seeded footer text" },
          { type: "links", label: "Explore" },
          { type: "contact", label: "Contact" },
        ],
      },
    },
    navHeader: [{ type: "page", page: homePageId, label: "Home" }],
    navFooter: [{ type: "custom", url: "/privacy", label: "Privacy" }],
  }

  if (existing.docs[0]) {
    return payload.update({
      collection: "site-settings",
      id: (existing.docs[0] as any).id,
      data: data as any,
      overrideAccess: true,
    })
  }

  return payload.create({
    collection: "site-settings",
    data: data as any,
    overrideAccess: true,
  })
}

export async function ensureE2ESeed(): Promise<E2ESeed> {
  const payload = await getPayloadForSeed()
  await ensureSuperAdmin(payload, SUPER_ADMIN, "E2E SA")
  await ensureSuperAdmin(payload, LOCAL_ADMIN, "Local Admin")

  const tenant = await upsertTenant(payload)
  const tenantId = (tenant as any).id
  await ensureTenantUser(payload, tenantId, "owner")
  await ensureTenantUser(payload, tenantId, "editor")
  await ensureTenantUser(payload, tenantId, "viewer")

  const home = await upsertPage(payload, tenantId, "home", {
    title: "Home",
    status: "published",
    blocks: [
      {
        blockType: "hero",
        anchor: "top",
        eyebrow: inline(text("Seeded")),
        headline: inline(text("Jeugdzorg met hart")),
        subheadline: block(para(text("Seeded page for canvas and form E2E coverage."))),
        cta: { label: "Contact", href: "#contact" },
      },
      {
        blockType: "featureList",
        anchor: "features",
        title: inline(text("Feature list")),
        intro: block(para(text("A seeded feature list for mobile editor drill tests."))),
        features: [
          { title: inline(text("Aandacht")), description: block(para(text("Feature one"))), icon: "heart" },
          { title: inline(text("Continuiteit")), description: block(para(text("Feature two"))), icon: "clock" },
        ],
      },
    ],
    seo: { title: "Home", description: "Seeded E2E home page" },
  })

  const secondary = await upsertPage(payload, tenantId, "secondary", {
    title: "Secondary",
    status: "draft",
    blocks: [
      {
        blockType: "hero",
        anchor: "secondary",
        headline: inline(text("Secondary page")),
        subheadline: block(para(text("Used by dirty-state regression tests."))),
      },
    ],
    seo: { title: "Secondary", description: "Seeded secondary E2E page" },
  })

  const pageId = (home as any).id
  const secondaryPageId = (secondary as any).id
  const settings = await upsertSiteSettings(payload, tenantId, pageId)

  const seed: E2ESeed = {
    superAdmin: SUPER_ADMIN,
    localAdmin: LOCAL_ADMIN,
    audit: {
      slug: AUDIT_SLUG,
      name: AUDIT_NAME,
      tenantId,
      pageId,
      pageUrl: `/sites/${AUDIT_SLUG}/pages/${pageId}`,
      secondaryPageId,
      secondaryPageUrl: `/sites/${AUDIT_SLUG}/pages/${secondaryPageId}`,
      siteSettingsId: (settings as any).id,
      mediaId: null,
    },
  }
  writeSeed(seed)
  return seed
}

export async function cleanupTenant(slug: string) {
  const payload = await getPayloadForSeed()
  const existing = await payload.find({
    collection: "tenants",
    where: { slug: { equals: slug } },
    limit: 1,
    overrideAccess: true,
  })
  const id = (existing.docs[0] as any)?.id
  if (!id) return
  await payload.delete({ collection: "tenants", id, overrideAccess: true })
}
