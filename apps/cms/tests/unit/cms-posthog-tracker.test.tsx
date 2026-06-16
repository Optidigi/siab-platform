// @vitest-environment jsdom
import { render, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { CmsPostHogTracker, type CmsPostHogConfig } from "@/components/analytics/CmsPostHogTracker"

const posthogMock = vi.hoisted(() => ({
  init: vi.fn(),
  capture: vi.fn(),
  register: vi.fn(),
  identify: vi.fn(),
}))

vi.mock("posthog-js", () => ({
  default: posthogMock,
}))

afterEach(() => {
  vi.clearAllMocks()
})

const config = (): CmsPostHogConfig => ({
  enabled: true,
  projectToken: "phc_test",
  apiHost: "https://r.siteinabox.nl",
  uiHost: "https://eu.posthog.com",
  context: {
    distinctId: "cms:42",
    environment: "production",
    adminHost: "admin.ami-care.nl",
    cmsMode: "tenant",
    tenantId: "7",
    tenantSlug: "amicare",
    siteDomain: "ami-care.nl",
    userRole: "owner",
  },
})

describe("CmsPostHogTracker", () => {
  it("initializes native PostHog tracking for the CMS without manual pageview capture", async () => {
    render(<CmsPostHogTracker config={config()} />)

    await waitFor(() => expect(posthogMock.init).toHaveBeenCalledTimes(1))
    const [token, options] = posthogMock.init.mock.calls[0]!

    expect(token).toBe("phc_test")
    expect(options).toMatchObject({
      api_host: "https://r.siteinabox.nl",
      ui_host: "https://eu.posthog.com",
      defaults: "2026-01-30",
      capture_pageview: "history_change",
      capture_pageleave: true,
      autocapture: true,
      capture_dead_clicks: true,
      disable_session_recording: true,
      bootstrap: {
        distinctID: "cms:42",
        isIdentifiedID: true,
      },
    })
    expect(posthogMock.capture).not.toHaveBeenCalled()
  })

  it("enriches native SDK events with CMS surface context", async () => {
    render(<CmsPostHogTracker config={config()} />)

    await waitFor(() => expect(posthogMock.init).toHaveBeenCalledTimes(1))
    const [, options] = posthogMock.init.mock.calls[0]!

    expect(options.before_send({
      event: "$pageview",
      properties: { $host: "admin.ami-care.nl" },
    })).toEqual({
      event: "$pageview",
      properties: expect.objectContaining({
        $host: "admin.ami-care.nl",
        analytics_surface: "cms",
        schema_version: 1,
        environment: "production",
        admin_host: "admin.ami-care.nl",
        cms_mode: "tenant",
        user_role: "owner",
        tenant_id: "7",
        tenant_slug: "amicare",
        site_id: "7",
        site_domain: "ami-care.nl",
      }),
    })

    options.loaded(posthogMock)

    expect(posthogMock.register).toHaveBeenCalledWith(expect.objectContaining({
      analytics_surface: "cms",
      admin_host: "admin.ami-care.nl",
    }))
    expect(posthogMock.identify).toHaveBeenCalledWith("cms:42", expect.objectContaining({
      analytics_surface: "cms",
      user_role: "owner",
    }))
  })
})
