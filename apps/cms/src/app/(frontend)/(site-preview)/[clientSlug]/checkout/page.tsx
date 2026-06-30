import type { Metadata } from "next"
import { headers } from "next/headers"
import { getLocale, getTranslations } from "next-intl/server"
import { notFound } from "next/navigation"
import { PreviewCheckout } from "@/components/preview/PreviewCheckout"
import { PreviewLoginShell } from "@/components/preview/PreviewLoginShell"
import { previewAuth } from "@/lib/preview/betterAuth"
import { isPreviewHost } from "@/lib/preview/previewHost"
import { loadPreviewGrantContext, normalizePreviewClientSlug } from "@/lib/preview/previewAccess"
import {
  domainCheckoutPrice,
  domainExtraFeeForProviderPrice,
  normalizeDomainOrderState,
  type DomainRegistrantDetails,
} from "@/lib/domains/orderState"
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
    const initialPrice = domainPriceLabels(locale, domainOrder)
    const registrant = domainOrder.registrant ?? deriveRegistrantDefaults({
      customerEmail: context.customerEmail,
      tenantName: String(context.tenant.name ?? ""),
      run: context.run,
    })

    return (
      <PreviewCheckout
        customerEmail={context.customerEmail}
        tenantName={String(context.tenant.name)}
        currentDomain={domainOrder.domain ?? context.tenant.domain}
        domainReady={domainOrder.status === "ready_to_register" && Boolean(domainOrder.domain)}
        registrant={registrant}
        priceLabel={formatCheckoutPrice(locale)}
        initialExtraFeeLabel={initialPrice.extraFeeLabel}
        initialTotalPriceLabel={initialPrice.totalPriceLabel}
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

function readObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function readText(source: Record<string, unknown> | null, keys: string[]): string | null {
  if (!source) return null
  for (const key of keys) {
    const value = source[key]
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return null
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return readObject(value)
}

function splitName(value: string | null): { firstName: string; lastName: string } {
  const parts = (value ?? "").trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { firstName: "", lastName: "" }
  if (parts.length === 1) return { firstName: parts[0] ?? "", lastName: "" }
  return { firstName: parts.slice(0, -1).join(" "), lastName: parts[parts.length - 1] ?? "" }
}

function deriveRegistrantDefaults(input: {
  customerEmail: string
  tenantName: string
  run: Awaited<ReturnType<typeof loadPreviewGrantContext>>["run"]
}): DomainRegistrantDetails | null {
  const intake = asRecord(input.run.intakeSubmission)
  const normalizedIntake = readObject(input.run.normalizedIntake)
  const generationInput = readObject(input.run.generationInput)
  const contact = readObject(normalizedIntake?.contact) ?? readObject(generationInput?.contact)
  const company = readObject(normalizedIntake?.company) ?? readObject(generationInput?.company)
  const contactName = readText(intake, ["contactName"]) ?? readText(contact, ["name", "contactName"]) ?? readText(normalizedIntake, ["contactName"])
  const { firstName, lastName } = splitName(contactName)
  const address = readText(contact, ["address"]) ?? readText(company, ["address"]) ?? ""

  return {
    companyName: (readText(intake, ["businessName"]) ?? readText(normalizedIntake, ["businessName"]) ?? input.tenantName) || null,
    firstName,
    lastName,
    email: readText(intake, ["contactEmail"]) ?? readText(contact, ["email"]) ?? input.customerEmail,
    street: address,
    number: "",
    suffix: null,
    zipcode: "",
    city: "",
    country: "NL",
    state: null,
    phoneCountryCode: "+31",
    phoneAreaCode: "",
    phoneSubscriberNumber: readText(contact, ["phone"]) ?? "",
    locale: "nl_NL",
  }
}

function formatMoney(locale: string, amount: string | null | undefined, currency = "EUR"): string | null {
  if (!amount) return null

  const numericAmount = Number(amount)
  if (!Number.isFinite(numericAmount)) return `${currency} ${amount}`

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(numericAmount)
}

function formatCheckoutPrice(locale: string): string {
  return formatMoney(
    locale,
    process.env.MOLLIE_SITE_PAYMENT_AMOUNT?.trim(),
    process.env.MOLLIE_SITE_PAYMENT_CURRENCY?.trim() || "EUR",
  ) ?? "EUR --"
}

function domainPriceLabels(locale: string, domainOrder: ReturnType<typeof normalizeDomainOrderState>) {
  const baseAmount = process.env.MOLLIE_SITE_PAYMENT_AMOUNT?.trim()
  const baseCurrency = process.env.MOLLIE_SITE_PAYMENT_CURRENCY?.trim() || "EUR"
  const providerPrice = domainOrder.providerPriceAmount && domainOrder.providerPriceCurrency
    ? { amount: domainOrder.providerPriceAmount, currency: domainOrder.providerPriceCurrency }
    : null
  const includedProviderPrice = domainOrder.maxProviderPriceAmount && domainOrder.maxProviderPriceCurrency
    ? { amount: domainOrder.maxProviderPriceAmount, currency: domainOrder.maxProviderPriceCurrency }
    : null
  if (!baseAmount || !includedProviderPrice) return { extraFeeLabel: null, totalPriceLabel: null }
  const extraFee = domainExtraFeeForProviderPrice(providerPrice, includedProviderPrice)
  const totalPrice = domainCheckoutPrice({
    basePrice: { amount: baseAmount, currency: baseCurrency },
    providerPrice,
    includedProviderPrice,
  })
  return {
    extraFeeLabel: formatMoney(locale, extraFee?.amount, extraFee?.currency ?? baseCurrency),
    totalPriceLabel: formatMoney(locale, totalPrice.amount, totalPrice.currency),
  }
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
