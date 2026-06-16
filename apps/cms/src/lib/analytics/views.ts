export const SITE_ANALYTICS_VIEWS = ["overview", "acquisition", "conversion", "behavior", "geography"] as const
export const ADMIN_ANALYTICS_VIEWS = [...SITE_ANALYTICS_VIEWS, "cms"] as const

export type SiteAnalyticsView = (typeof SITE_ANALYTICS_VIEWS)[number]
export type AdminAnalyticsView = (typeof ADMIN_ANALYTICS_VIEWS)[number]

export const parseSiteAnalyticsView = (value: string | undefined): SiteAnalyticsView =>
  SITE_ANALYTICS_VIEWS.includes(value as SiteAnalyticsView) ? (value as SiteAnalyticsView) : "overview"

export const parseAdminAnalyticsView = (value: string | undefined): AdminAnalyticsView =>
  ADMIN_ANALYTICS_VIEWS.includes(value as AdminAnalyticsView) ? (value as AdminAnalyticsView) : "overview"
