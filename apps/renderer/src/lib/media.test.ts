import assert from "node:assert/strict"
import test from "node:test"
import { createRendererMediaResolver, publicRendererMediaPath, safeTenantMediaFilePath } from "./media"

test("rewrites tenant-media and filename refs to the renderer public media route", () => {
  const resolveMedia = createRendererMediaResolver("tenant-123")

  assert.deepEqual(resolveMedia("/api/tenant-media/7/bedroom.jpg"), "/siab-media/tenant-123/bedroom.jpg")
  assert.deepEqual(resolveMedia("logo mark.svg"), "/siab-media/tenant-123/logo%20mark.svg")
  assert.deepEqual(resolveMedia({ filename: "favicon.ico", alt: "Tenant favicon" }), {
    src: "/siab-media/tenant-123/favicon.ico",
    alt: "Tenant favicon",
  })
  assert.deepEqual(resolveMedia({ url: "/api/tenant-media/7/nested/hero.webp", filename: "hero.webp" }), {
    src: "/siab-media/tenant-123/nested/hero.webp",
    alt: undefined,
  })
})

test("preserves non-media absolute and root-relative refs", () => {
  const resolveMedia = createRendererMediaResolver("tenant-123")

  assert.equal(resolveMedia("https://cdn.example.test/image.jpg"), "https://cdn.example.test/image.jpg")
  assert.deepEqual(resolveMedia({ url: "/favicon.svg", filename: "favicon.svg", alt: "Favicon" }), {
    src: "/favicon.svg",
    alt: "Favicon",
  })
})

test("rejects unsafe tenant ids and media paths", () => {
  assert.equal(publicRendererMediaPath("../tenant", "image.jpg"), null)
  assert.equal(publicRendererMediaPath("tenant-123", "../image.jpg"), null)
  assert.equal(publicRendererMediaPath("tenant-123", "nested/../image.jpg"), null)
  assert.equal(safeTenantMediaFilePath({ dataDir: "/data", tenantId: "tenant-123", mediaPath: "nested/image.jpg" }), "/data/tenants/tenant-123/media/nested/image.jpg")
  assert.equal(safeTenantMediaFilePath({ dataDir: "/data", tenantId: "tenant-123", mediaPath: "/nested/image.jpg" }), "/data/tenants/tenant-123/media/nested/image.jpg")
})
