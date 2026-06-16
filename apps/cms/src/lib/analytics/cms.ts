import "server-only"
import { analyticsEnvironment } from "./config"
import { captureAnalyticsEvent } from "./posthogClient"
import type { AnalyticsBaseProperties, AnalyticsEventProperties, CmsEventName } from "./events"
import type { SiabContext } from "@/lib/context"
import type { User } from "@/payload-types"

const tenantIdOf = (ctx: SiabContext): string | null =>
  ctx.mode === "tenant" ? String(ctx.tenant.id) : null

const tenantSlugOf = (ctx: SiabContext): string | null =>
  ctx.mode === "tenant" ? String(ctx.tenant.slug ?? "") || null : null

const tenantDomainOf = (ctx: SiabContext): string | null =>
  ctx.mode === "tenant" ? String(ctx.tenant.domain ?? "") || null : null

export const captureCmsUsageEvent = async ({
  event,
  user,
  ctx,
  surface,
  action,
  properties,
}: {
  event: CmsEventName
  user: User
  ctx: SiabContext
  surface: string
  action?: string
  properties?: AnalyticsEventProperties
}): Promise<void> => {
  const tenantId = tenantIdOf(ctx)
  const base: AnalyticsBaseProperties = {
    schema_version: 1,
    analytics_surface: "cms",
    environment: analyticsEnvironment(),
    admin_host: null,
    tenant_id: tenantId,
    tenant_slug: tenantSlugOf(ctx),
    site_id: tenantId,
    site_domain: tenantDomainOf(ctx),
    page_id: null,
    page_slug: null,
    page_path: null,
    theme_id: null,
    site_build_id: null,
    manifest_version: null,
  }

  try {
    await captureAnalyticsEvent({
      event,
      distinctId: `cms:${user.id}`,
      properties: {
        ...properties,
        ...base,
        cms_surface: surface,
        ...(action ? { cms_action: action } : {}),
        cms_mode: ctx.mode,
        user_role: user.role,
      },
    })
  } catch (err) {
    console.warn("[analytics] CMS usage capture failed", err)
  }
}
