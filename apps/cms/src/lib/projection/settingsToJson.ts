import { resolveNav, type NavPage } from "@/lib/projection/resolveNav"
import { normalizeFooterColumns } from "@/lib/footerComposition"
import { isSafeHref } from "@/lib/security/safeHref"
import { resolvePublicAnalyticsConfig, type PublicAnalyticsConfigInput } from "@/lib/analytics/config"
import { mediaToJson } from "@/lib/projection/media"
import {
  DEFAULT_CLIENT_SETTINGS_CONTRACT,
  type SettingsContract,
} from "@/lib/settingsContract"

export type SettingsAnalyticsProjectionContext = {
  tenantId?: string | number | null
  tenantSlug?: string | null
  siteDomain?: string | null
  themeId?: string | null
  siteBuildId?: string | null
  manifestVersion?: string | number | null
  analytics?: PublicAnalyticsConfigInput | null
}

export type SettingsProjectionContext = {
  settingsContract?: SettingsContract | null
}

const when = <T>(enabled: boolean, value: T): T | undefined => enabled ? value : undefined

/**
 * Serialise a SiteSettings doc to its `site.json` shape.
 *
 * `publishedPages` is needed for nav resolution — `page` / `section` entries
 * resolve their href + label from the published page set. Callers fetch it
 * once and pass it in, keeping this function pure + unit-testable. An empty
 * array is valid: page/section entries simply resolve to nothing.
 */
export function settingsToJson(
  doc: any,
  publishedPages: NavPage[] = [],
  analyticsContext: SettingsAnalyticsProjectionContext = {},
  projectionContext: SettingsProjectionContext = {},
) {
  const contract = projectionContext.settingsContract ?? DEFAULT_CLIENT_SETTINGS_CONTRACT
  const contact = doc.contact
  const nap = doc.nap

  return {
    siteName: doc.siteName,
    siteUrl: doc.siteUrl,
    description: when(contract.general.description, doc.description),
    language: when(contract.general.language, doc.language),
    aliases: (doc.aliases ?? []).map((a: any) => ({ host: a.host })),
    contactEmail: when(contract.general.contactEmail, doc.contactEmail),
    branding: doc.branding ? {
      logo: when(contract.identity.branding.logo, mediaToJson(doc.branding.logo)),
      favicon: when(contract.identity.branding.favicon, mediaToJson(doc.branding.favicon)),
      primaryColor: doc.branding.primaryColor
    } : undefined,
    chrome: doc.chrome ? {
      header: doc.chrome.header ? {
        logo: mediaToJson(doc.chrome.header.logo)
      } : undefined,
      footer: doc.chrome.footer ? {
        logo: mediaToJson(doc.chrome.footer.logo),
        tagline: doc.chrome.footer.tagline,
        copyright: doc.chrome.footer.copyright,
        columns: normalizeFooterColumns(doc.chrome.footer.columns)
      } : undefined
    } : undefined,
    maintenance: contract.operations.maintenance && doc.maintenance ? {
      enabled: !!doc.maintenance.enabled,
      message: doc.maintenance.message
    } : undefined,
    contact: contact && (
      contract.details.contact.phone ||
      contract.details.contact.address ||
      contract.details.contact.social
    ) ? {
      phone: when(contract.details.contact.phone, contact.phone),
      address: when(contract.details.contact.address, contact.address),
      social: contract.details.contact.social
        ? (contact.social ?? [])
        .filter((s: any) => isSafeHref(s?.url))
        .map((s: any) => ({ platform: s.platform, url: s.url.trim() }))
        : undefined
    } : undefined,
    nap: nap && Object.values(contract.details.business).some(Boolean) ? {
      legalName: when(contract.details.business.legalName, nap.legalName),
      kvkNumber: when(contract.details.business.kvkNumber, nap.kvkNumber),
      establishmentNumber: when(contract.details.business.establishmentNumber, nap.establishmentNumber),
      streetAddress: when(contract.details.business.streetAddress, nap.streetAddress),
      city: when(contract.details.business.city, nap.city),
      region: when(contract.details.business.region, nap.region),
      postalCode: when(contract.details.business.postalCode, nap.postalCode),
      country: when(contract.details.business.country, nap.country)
    } : undefined,
    hours: contract.details.hours ? (doc.hours ?? []).map((h: any) => ({
      day: h.day,
      open: h.open,
      close: h.close,
      closed: !!h.closed
    })) : [],
    serviceArea: contract.details.serviceArea
      ? (doc.serviceArea ?? []).map((s: any) => ({ name: s.name }))
      : [],
    navHeader: resolveNav(doc.navHeader, publishedPages),
    navFooter: resolveNav(doc.navFooter, publishedPages),
    analytics: {
      ...resolvePublicAnalyticsConfig(analyticsContext.analytics),
      schemaVersion: 1,
      tenantId: analyticsContext.tenantId != null ? String(analyticsContext.tenantId) : null,
      tenantSlug: analyticsContext.tenantSlug ?? null,
      siteId: analyticsContext.tenantId != null ? String(analyticsContext.tenantId) : null,
      siteDomain: analyticsContext.siteDomain ?? null,
      themeId: analyticsContext.themeId ?? null,
      siteBuildId: analyticsContext.siteBuildId ?? null,
      manifestVersion: analyticsContext.manifestVersion ?? null,
    }
  }
}
