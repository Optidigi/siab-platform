import type { Metadata } from "next"
import { headers } from "next/headers"
import { getLocale, getTranslations } from "next-intl/server"
import { notFound } from "next/navigation"
import { PreviewCheckout } from "@/components/preview/PreviewCheckout"
import { PreviewLoginShell } from "@/components/preview/PreviewLoginShell"
import { previewAuth } from "@/lib/preview/betterAuth"
import { isPreviewHost } from "@/lib/preview/previewHost"
import { loadPreviewGrantContext, normalizePreviewClientSlug } from "@/lib/preview/previewAccess"
import { normalizeDomainOrderState } from "@/lib/domains/orderState"
import {
  checkPreviewCheckoutDomainAction,
  startPreviewCheckoutPaymentAction,
} from "./actions"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("preview")
  return { title: t("checkoutMetadataTitle") }
}

export default async function PreviewCheckoutPage({
  params,
}: {
  params: Promise<{ clientSlug: string }>
}) {
  if (!(await isPreviewHost())) notFound()

  const { clientSlug } = await params
  const normalizedClientSlug = normalizePreviewClientSlug(clientSlug)
  if (!normalizedClientSlug) notFound()

  const t = await getTranslations("preview")
  const locale = await getLocale()
  const headerStore = await headers()
  const callbackPath = `/${normalizedClientSlug}/checkout`
  const session = await previewAuth.api.getSession({
    headers: headerStore,
    query: { disableCookieCache: true },
  })
  const customerEmail = session?.user?.email

  if (!customerEmail) {
    return (
      <PreviewCheckoutAccessScreen
        clientSlug={normalizedClientSlug}
        callbackPath={callbackPath}
        title={t("loginTitle")}
        description={t("loginDescription")}
      />
    )
  }

  try {
    const context = await loadPreviewGrantContext({
      clientSlug: normalizedClientSlug,
      email: customerEmail,
    })
    const payment = context.run.payment && typeof context.run.payment === "object"
      ? context.run.payment as { status?: string | null }
      : null
    const approval = context.run.clientApproval && typeof context.run.clientApproval === "object"
      ? context.run.clientApproval as { status?: string | null }
      : null
    const domainOrder = normalizeDomainOrderState(context.run.domainOrder)

    return (
      <PreviewCheckout
        customerEmail={context.customerEmail}
        tenantName={String(context.tenant.name)}
        currentDomain={domainOrder.domain ?? context.tenant.domain}
        priceLabel={formatCheckoutPrice(locale)}
        paymentStatus={payment?.status ?? "not_started"}
        approvalStatus={approval?.status ?? "pending"}
        previewHref={`/${context.clientSlug}`}
        checkDomainAction={checkPreviewCheckoutDomainAction.bind(null, context.clientSlug)}
        startPaymentAction={startPreviewCheckoutPaymentAction.bind(null, context.clientSlug)}
      />
    )
  } catch {
    return (
      <PreviewCheckoutAccessScreen
        clientSlug={normalizedClientSlug}
        callbackPath={callbackPath}
        title={t("accessUnavailableTitle")}
        description={t("accessUnavailableDescription")}
      />
    )
  }
}

function formatCheckoutPrice(locale: string): string {
  const amount = process.env.MOLLIE_SITE_PAYMENT_AMOUNT?.trim()
  const currency = process.env.MOLLIE_SITE_PAYMENT_CURRENCY?.trim() || "EUR"
  if (!amount) return "EUR --"

  const numericAmount = Number(amount)
  if (!Number.isFinite(numericAmount)) return `${currency} ${amount}`

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(numericAmount)
}

function PreviewCheckoutAccessScreen({
  clientSlug,
  callbackPath,
  title,
  description,
}: {
  clientSlug: string
  callbackPath: string
  title: string
  description: string
}) {
  return (
    <PreviewLoginShell
      clientSlug={clientSlug}
      callbackPath={callbackPath}
      title={title}
      description={description}
    />
  )
}
