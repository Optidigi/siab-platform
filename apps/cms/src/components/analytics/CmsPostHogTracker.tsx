"use client"

import { useEffect, useRef } from "react"
import posthog from "posthog-js"
import type { CaptureResult } from "posthog-js"

type CmsPostHogContext = {
  distinctId: string
  environment: "production" | "staging" | "development"
  adminHost: string | null
  cmsMode: "super-admin" | "tenant"
  tenantId: string | null
  tenantSlug: string | null
  siteDomain: string | null
  userRole: "super-admin" | "owner" | "editor" | "viewer"
}

export type CmsPostHogConfig = {
  enabled: boolean
  projectToken: string | null
  apiHost: string
  uiHost: string
  context: CmsPostHogContext
}

type PostHogEvent = {
  event?: string
  properties?: Record<string, unknown>
}

const isEventObject = (event: unknown): event is PostHogEvent =>
  !!event && typeof event === "object"

const nativeCmsProperties = (context: CmsPostHogContext) => ({
  analytics_surface: "cms",
  schema_version: 1,
  environment: context.environment,
  admin_host: context.adminHost,
  cms_mode: context.cmsMode,
  user_role: context.userRole,
  tenant_id: context.tenantId,
  tenant_slug: context.tenantSlug,
  site_id: context.tenantId,
  site_domain: context.siteDomain,
})

const enrichCmsEvent = (context: CmsPostHogContext, event: CaptureResult | null): CaptureResult | null => {
  if (!isEventObject(event)) return event

  event.properties = {
    ...event.properties,
    ...nativeCmsProperties(context),
  }

  return event as CaptureResult
}

export function CmsPostHogTracker({ config }: { config: CmsPostHogConfig }) {
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    if (!config.enabled || !config.projectToken) return

    initialized.current = true

    posthog.init(config.projectToken, {
      api_host: config.apiHost,
      ui_host: config.uiHost,
      defaults: "2026-01-30",
      capture_pageview: "history_change",
      capture_pageleave: true,
      autocapture: true,
      capture_dead_clicks: true,
      disable_session_recording: true,
      bootstrap: {
        distinctID: config.context.distinctId,
        isIdentifiedID: true,
      },
      before_send: (event) => enrichCmsEvent(config.context, event),
      loaded: (client) => {
        client.register(nativeCmsProperties(config.context))
        client.identify(config.context.distinctId, {
          analytics_surface: "cms",
          cms_mode: config.context.cmsMode,
          user_role: config.context.userRole,
          tenant_id: config.context.tenantId,
          tenant_slug: config.context.tenantSlug,
          site_domain: config.context.siteDomain,
        })
      },
    })
  }, [config])

  return null
}
