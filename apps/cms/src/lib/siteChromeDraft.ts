import type { FooterCompositionColumn, FooterCompositionContract } from "@/lib/footerComposition"
import {
  comparableFooterColumns,
  defaultFooterColumns,
  normalizeFooterColumns,
} from "@/lib/footerComposition"
import { normalizeUploadId } from "@/lib/uploadValues"

export type SiteChromeDraft = {
  header: { logo: unknown }
  footer: {
    logo: unknown
    tagline: string | null
    copyright: string | null
    columns: FooterCompositionColumn[]
  }
}

export const chromeDraftFromSettings = (
  settings: any,
  footerContract: FooterCompositionContract | null,
): SiteChromeDraft => ({
  header: { logo: settings?.chrome?.header?.logo ?? null },
  footer: {
    logo: settings?.chrome?.footer?.logo ?? null,
    tagline: settings?.chrome?.footer?.tagline ?? null,
    copyright: settings?.chrome?.footer?.copyright ?? null,
    columns: defaultFooterColumns(settings, footerContract),
  },
})

export const chromeComparable = (
  draft: SiteChromeDraft,
  footerContract: FooterCompositionContract | null,
) => ({
  header: { logo: normalizeUploadId(draft.header.logo) ?? null },
  footer: {
    logo: normalizeUploadId(draft.footer.logo) ?? null,
    tagline: draft.footer.tagline ?? null,
    copyright: draft.footer.copyright ?? null,
    columns: comparableFooterColumns(draft.footer.columns, footerContract),
  },
})

export const chromePatchFromDraft = (
  draft: SiteChromeDraft,
  footerContract: FooterCompositionContract | null,
) => ({
  header: {
    logo: normalizeUploadId(draft.header.logo),
  },
  footer: {
    logo: normalizeUploadId(draft.footer.logo),
    tagline: draft.footer.tagline ?? null,
    copyright: draft.footer.copyright ?? null,
    columns: normalizeFooterColumns(draft.footer.columns, footerContract),
  },
})

export const mergeChromeSettings = (settings: any, draft: SiteChromeDraft) => ({
  ...(settings ?? {}),
  chrome: {
    ...(settings?.chrome ?? {}),
    header: {
      ...(settings?.chrome?.header ?? {}),
      logo: draft.header.logo,
    },
    footer: {
      ...(settings?.chrome?.footer ?? {}),
      logo: draft.footer.logo,
      tagline: draft.footer.tagline,
      copyright: draft.footer.copyright,
      columns: draft.footer.columns,
    },
  },
})
