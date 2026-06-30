"use client"

import * as React from "react"
import { useLocale, useTranslations } from "next-intl"
import { useForm } from "react-hook-form"
import type { Page, SiteSettings } from "@siteinabox/contracts"
import { AlertCircle, CheckCircle2, Clock, CreditCard, Loader2 } from "lucide-react"
import { Badge } from "@siteinabox/ui/components/badge"
import { Button } from "@siteinabox/ui/components/button"
import { Form } from "@siteinabox/ui/components/form"
import { cn } from "@siteinabox/ui/lib/utils"
import { BlockPresetsProvider } from "@/components/editor/canvas/BlockPresetsContext"
import { CanvasMode } from "@/components/editor/canvas/CanvasMode"
import { CanvasSelectionProvider } from "@/components/editor/canvas/CanvasSelectionContext"
import type { ElementPath } from "@/components/editor/canvas/elementPath"
import {
  SiteChromeActionFrame,
  SiteChromePreview,
  type SiteChromeSelection,
  type SiteChromeSelectPoint,
} from "@/components/editor/canvas/SiteChromePreview"
import { FLOATING_PILL_CLASS } from "@/components/editor/mode/mode-bar"
import { RtManifestProvider } from "@/components/editor/RtManifestContext"
import { ThemeBar } from "@/components/editor/theme/theme-bar"
import { setPreviewTheme } from "@/lib/actions/previewCustomizer"
import type {
  PreviewApprovalState,
  PreviewCustomizerAccess,
  PreviewPageSummary,
  PreviewPaymentState,
} from "@/lib/preview/customizer"
import type { RtManifest } from "@/lib/richText/manifest"
import type { ThemeTokens } from "@/lib/theme/schema"
import { FONT_PRESETS, PALETTE_PRESETS, RADIUS_PRESETS } from "@/lib/theme/presets"
import { normalizeThemeForSave } from "@/lib/theme/normalizeTheme"

type SaveState = "idle" | "saving" | "saved" | "error"
type PreviewCanvasFormValues = { blocks: Page["blocks"] }

const formatExpiry = (exp: number, locale: string, fallback: string) => {
  const date = new Date(exp * 1000)
  return Number.isNaN(date.getTime()) ? fallback : date.toLocaleString(locale)
}

export function PreviewCustomizer({
  access,
  pages,
  page,
  settings,
  manifest,
  theme,
  approval,
  payment,
  tenantId,
  tenantSlug,
  domain,
}: {
  access: PreviewCustomizerAccess
  pages: PreviewPageSummary[]
  page: Page
  settings: SiteSettings
  manifest: RtManifest
  theme: ThemeTokens | null
  approval: PreviewApprovalState | null
  payment: PreviewPaymentState | null
  tenantId: string | number
  tenantSlug?: string | null
  domain?: string | null
}) {
  const locale = useLocale()
  const t = useTranslations("preview")
  const [themeState, setThemeState] = React.useState<ThemeTokens | null>(() => normalizeThemeForSave(theme))
  const [themeSaveState, setThemeSaveState] = React.useState<SaveState>("idle")
  const [themeMessage, setThemeMessage] = React.useState<string | null>(null)
  const [approvalState] = React.useState<PreviewApprovalState | null>(approval)
  const [paymentState] = React.useState<PreviewPaymentState | null>(payment)
  const [selected, setSelected] = React.useState<ElementPath | null>(null)
  const initialThemeRef = React.useRef(JSON.stringify(normalizeThemeForSave(theme) ?? {}))
  const saveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const form = useForm<PreviewCanvasFormValues>({
    defaultValues: { blocks: page.blocks ?? [] },
  })

  React.useEffect(() => {
    form.reset({ blocks: page.blocks ?? [] })
  }, [form, page.id, page.blocks])

  React.useEffect(() => {
    const serialized = JSON.stringify(normalizeThemeForSave(themeState) ?? {})
    if (serialized === initialThemeRef.current) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      setThemeSaveState("saving")
      setThemeMessage(null)
      setPreviewTheme(access, themeState ?? {})
        .then((saved) => {
          initialThemeRef.current = JSON.stringify(saved ?? {})
          setThemeState(saved)
          setThemeSaveState("saved")
          setThemeMessage(t("themeSaved"))
        })
        .catch((error) => {
          setThemeSaveState("error")
          setThemeMessage(error instanceof Error ? error.message : t("themeSaveFailed"))
        })
    }, 500)
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [themeState, access, t])

  const saveStatus =
    themeSaveState === "saving"
      ? t("savingStyles")
      : themeSaveState === "saved"
        ? themeMessage
        : themeSaveState === "error"
          ? themeMessage
          : t("stylesReady")
  const paymentStatus = formatPaymentStatus(paymentState?.status, t)
  const paymentSatisfied = paymentState?.status === "completed" || paymentState?.status === "waived"
  const canCompleteOrder = access.type === "grant" && !paymentSatisfied
  const pageHref = (summary: PreviewPageSummary) =>
    access.type === "grant"
      ? (summary.slug === "index" || summary.slug === "home"
          ? `/${access.clientSlug}`
          : `/${access.clientSlug}/pages/${encodeURIComponent(summary.slug)}`)
      : `/preview/${access.token}?page=${encodeURIComponent(summary.slug)}`

  const activePageId = String(page.id)
  const activePageSlug = String(page.slug)
  const previewLabel = domain ?? tenantSlug ?? (access.type === "grant" ? access.clientSlug : t("metadataTitle"))
  const checkoutHref = access.type === "grant" ? `/${access.clientSlug}/checkout` : "#"
  const preventCustomerChromeSelection = React.useCallback((_selection?: SiteChromeSelection, _point?: SiteChromeSelectPoint) => {}, [])
  const preventCustomerChromeNavigate = React.useCallback((_href: string) => {}, [])
  const headerChrome = (
    <SiteChromePreview
      zone="header"
      settings={settings}
      manifest={manifest}
      onNavigate={preventCustomerChromeNavigate}
      onSelect={preventCustomerChromeSelection}
    />
  )
  const footerChrome = (
    <SiteChromePreview
      zone="footer"
      settings={settings}
      manifest={manifest}
      onNavigate={preventCustomerChromeNavigate}
      onSelect={preventCustomerChromeSelection}
    />
  )
  const renderHeaderChrome = React.useCallback((defaultChrome: React.ReactNode) => (
    <SiteChromeActionFrame
      zone="header"
      onNavigate={preventCustomerChromeNavigate}
      onSelect={preventCustomerChromeSelection}
    >
      {defaultChrome}
    </SiteChromeActionFrame>
  ), [preventCustomerChromeNavigate, preventCustomerChromeSelection])
  const renderFooterChrome = React.useCallback((defaultChrome: React.ReactNode) => (
    <SiteChromeActionFrame
      zone="footer"
      onNavigate={preventCustomerChromeNavigate}
      onSelect={preventCustomerChromeSelection}
    >
      {defaultChrome}
    </SiteChromeActionFrame>
  ), [preventCustomerChromeNavigate, preventCustomerChromeSelection])

  return (
    <RtManifestProvider manifest={manifest}>
      <Form {...form}>
        <form className="min-h-dvh bg-background text-foreground" onSubmit={(event) => event.preventDefault()}>
          <CanvasSelectionProvider value={{ view: "sidebar", selected, select: setSelected }}>
            <header data-siab-cms-sticky-chrome className="sticky top-0 z-30 border-b bg-background">
              <div className="flex min-h-14 flex-col gap-2 px-3 py-2 md:min-h-12 md:flex-row md:items-center md:px-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{page.title || t("metadataTitle")}</p>
                  <p className="truncate text-xs text-muted-foreground">{previewLabel}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={themeSaveState === "error" ? "destructive" : themeSaveState === "saving" ? "secondary" : "outline"}>
                    {themeSaveState === "saving" ? (
                      <Loader2 className="size-3 animate-spin" aria-hidden />
                    ) : themeSaveState === "error" ? (
                      <AlertCircle className="size-3" aria-hidden />
                    ) : (
                      <CheckCircle2 className="size-3" aria-hidden />
                    )}
                    {saveStatus}
                  </Badge>
                  {access.type === "legacy-token" && (
                    <Badge variant="outline">
                      <Clock className="size-3" aria-hidden />
                      {t("expires", { date: formatExpiry(access.exp, locale, t("unknownExpiry")) })}
                    </Badge>
                  )}
                </div>
              </div>
            </header>

            <div data-siab-cms-sticky-chrome className="sticky top-14 z-20 flex flex-col items-center gap-2 border-b border-transparent bg-background/70 px-3 py-2 backdrop-blur md:top-12">
              {pages.length > 1 && (
                <nav className={cn(FLOATING_PILL_CLASS, "max-w-full overflow-x-auto")} aria-label={t("pagesNav")}>
                  <div className="flex items-center gap-1">
                    {pages.map((summary) => {
                      const active = String(summary.slug) === activePageSlug || String(summary.id) === activePageId
                      return (
                        <Button key={summary.id} asChild size="sm" variant={active ? "default" : "ghost"} className="h-8 shrink-0">
                          <a href={pageHref(summary)} aria-current={active ? "page" : undefined}>
                            {summary.title || summary.slug}
                          </a>
                        </Button>
                      )
                    })}
                  </div>
                </nav>
              )}
              <div className="pointer-events-auto">
                <ThemeBar
                  theme={themeState}
                  manifest={manifest}
                  onThemeChange={setThemeState}
                  palettes={PALETTE_PRESETS}
                  fonts={FONT_PRESETS}
                  radiusLevels={RADIUS_PRESETS}
                />
              </div>
            </div>

            <main className="w-full pb-28">
              <BlockPresetsProvider tenantId={tenantId} manifest={manifest}>
                <CanvasMode
                  view="sidebar"
                  manifest={manifest}
                  tenantCss={null}
                  theme={themeState}
                  rendererSettings={settings}
                  tenantId={tenantId}
                  tenantSlug={tenantSlug}
                  tenantDomain={domain}
                  readOnly
                  headerChrome={headerChrome}
                  footerChrome={footerChrome}
                  renderHeaderChrome={renderHeaderChrome}
                  renderFooterChrome={renderFooterChrome}
                  reorderBlocks={() => {}}
                  deleteBlock={() => {}}
                  duplicateBlock={() => {}}
                  pageTitle={page.title || t("metadataTitle")}
                  onDeletePage={() => {}}
                />
              </BlockPresetsProvider>
            </main>

            <PreviewCommandBar
              approvalState={approvalState}
              paymentStatus={paymentStatus}
              canCompleteOrder={canCompleteOrder}
              checkoutHref={checkoutHref}
            />
          </CanvasSelectionProvider>
        </form>
      </Form>
    </RtManifestProvider>
  )
}

function PreviewCommandBar({
  approvalState,
  paymentStatus,
  canCompleteOrder,
  checkoutHref,
}: {
  approvalState: PreviewApprovalState | null
  paymentStatus: string
  canCompleteOrder: boolean
  checkoutHref: string
}) {
  const t = useTranslations("preview")
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 px-3 py-3 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/85">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Badge variant={approvalState?.status === "approved" ? "success" : "secondary"}>
            {approvalState?.status === "approved" ? t("approved") : t("pendingApproval")}
          </Badge>
          <span>{t("paymentStatus", { status: paymentStatus })}</span>
        </div>
        {canCompleteOrder && (
          <Button asChild className="w-full md:w-auto">
            <a href={checkoutHref}>
              <CreditCard className="size-4" />
              {t("completeOrder")}
            </a>
          </Button>
        )}
      </div>
    </div>
  )
}

function formatPaymentStatus(status: string | null | undefined, t: ReturnType<typeof useTranslations<"preview">>): string {
  switch (status) {
    case "completed":
      return t("paymentCompleted")
    case "waived":
      return t("paymentWaived")
    case "pending_provider":
      return t("paymentPendingProvider")
    case "not_started":
    case undefined:
    case null:
      return t("paymentNotStarted")
    default:
      return status.replace(/_/g, " ")
  }
}
