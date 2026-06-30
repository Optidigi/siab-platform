import { afterEach, describe, expect, it, vi } from "vitest"
import {
  buildCloudflareDnsRecordRequests,
  createCloudflareDnsRecord,
  createCloudflareZone,
  createCloudflareZoneDnsRecords,
} from "@/lib/domains/cloudflare"

const ORIGINAL_FETCH = globalThis.fetch

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH
  vi.restoreAllMocks()
})

const env = {
  CLOUDFLARE_API_BASE_URL: "https://cloudflare.test/client/v4",
  CLOUDFLARE_API_TOKEN: "cf-token",
  CLOUDFLARE_ACCOUNT_ID: "account-123",
  SIAB_RENDERER_TARGET_HOST: "renderer.siteinabox.nl",
} as unknown as NodeJS.ProcessEnv

describe("Cloudflare domain adapter", () => {
  it("creates a full zone and returns Cloudflare nameservers", async () => {
    const fetchMock = vi.fn(async () => Response.json({
      success: true,
      result: {
        id: "zone-123",
        name: "example.nl",
        name_servers: ["ada.ns.cloudflare.com", "bob.ns.cloudflare.com"],
      },
    }))

    await expect(createCloudflareZone("Example.nl", {
      env,
      fetchImpl: fetchMock as typeof fetch,
    })).resolves.toMatchObject({
      id: "zone-123",
      name: "example.nl",
      nameServers: ["ada.ns.cloudflare.com", "bob.ns.cloudflare.com"],
    })

    expect(fetchMock).toHaveBeenCalledWith("https://cloudflare.test/client/v4/zones", {
      method: "POST",
      headers: {
        Authorization: "Bearer cf-token",
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        account: { id: "account-123" },
        name: "example.nl",
        type: "full",
      }),
    })
  })

  it("builds proxied renderer DNS records from host or IP env", () => {
    expect(buildCloudflareDnsRecordRequests("example.nl", env)).toEqual([
      {
        type: "CNAME",
        name: "example.nl",
        content: "renderer.siteinabox.nl",
        ttl: 1,
        proxied: true,
      },
      {
        type: "CNAME",
        name: "www.example.nl",
        content: "example.nl",
        ttl: 1,
        proxied: true,
      },
    ])

    expect(buildCloudflareDnsRecordRequests("example.nl", {
      ...env,
      SIAB_RENDERER_TARGET_HOST: "",
      SIAB_RENDERER_TARGET_IP: "203.0.113.10",
    } as unknown as NodeJS.ProcessEnv, { ttl: 300, proxied: false })).toEqual([
      {
        type: "A",
        name: "example.nl",
        content: "203.0.113.10",
        ttl: 300,
        proxied: false,
      },
      {
        type: "CNAME",
        name: "www.example.nl",
        content: "example.nl",
        ttl: 300,
        proxied: false,
      },
    ])
  })

  it("requires renderer target config before building DNS records", () => {
    expect(() => buildCloudflareDnsRecordRequests("example.nl", {
      ...env,
      SIAB_RENDERER_TARGET_HOST: "",
      SIAB_RENDERER_TARGET_IP: "",
    } as unknown as NodeJS.ProcessEnv)).toThrow("SIAB_RENDERER_TARGET_HOST or SIAB_RENDERER_TARGET_IP")
  })

  it("creates individual and batched DNS records", async () => {
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body)) as { type: "A" | "CNAME"; name: string; content: string; proxied: boolean }
      return Response.json({
        success: true,
        result: {
          id: `record-${body.name}`,
          type: body.type,
          name: body.name,
          content: body.content,
          proxied: body.proxied,
        },
      })
    })

    await expect(createCloudflareDnsRecord("zone-123", {
      type: "CNAME",
      name: "example.nl",
      content: "renderer.siteinabox.nl",
      ttl: 1,
      proxied: true,
    }, {
      env,
      fetchImpl: fetchMock as typeof fetch,
    })).resolves.toMatchObject({
      id: "record-example.nl",
      type: "CNAME",
      name: "example.nl",
      content: "renderer.siteinabox.nl",
      proxied: true,
    })

    await expect(createCloudflareZoneDnsRecords("zone-123", "example.nl", {
      env,
      fetchImpl: fetchMock as typeof fetch,
    })).resolves.toHaveLength(2)

    expect(fetchMock).toHaveBeenCalledWith(
      "https://cloudflare.test/client/v4/zones/zone-123/dns_records",
      expect.objectContaining({ method: "POST" }),
    )
  })
})
