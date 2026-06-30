"use server"

import { headers } from "next/headers"
import { getTranslations } from "next-intl/server"
import { previewAuth } from "@/lib/preview/betterAuth"
import { loadPreviewGrantContext, normalizePreviewClientSlug } from "@/lib/preview/previewAccess"
import { checkAndRecordPreviewDomainOrder, requireReadyPreviewDomainOrder } from "@/lib/domains/previewDomainOrder"
import { createMollieCheckoutForGenerationRun } from "@/lib/payments/molliePayments"

export type PreviewCheckoutActionState = {
  ok: boolean
  message: string
  checkoutUrl?: string
}

const requirePreviewCheckoutContext = async (clientSlug: string) => {
  const t = await getTranslations("preview")
  const session = await previewAuth.api.getSession({
    headers: await headers(),
    query: { disableCookieCache: true },
  })
  const customerEmail = session?.user?.email
  if (!customerEmail) throw new Error(t("previewLoginRequired"))

  return loadPreviewGrantContext({
    clientSlug: normalizePreviewClientSlug(clientSlug),
    email: customerEmail,
  })
}

export async function checkPreviewCheckoutDomainAction(
  clientSlug: string,
  _previousState: PreviewCheckoutActionState,
  formData: FormData,
): Promise<PreviewCheckoutActionState> {
  const t = await getTranslations("preview")
  const context = await requirePreviewCheckoutContext(clientSlug)

  const domain = String(formData.get("domain") ?? "").trim().toLowerCase()
  if (!domain) return { ok: false, message: t("checkoutDomainRequired") }

  try {
    const result = await checkAndRecordPreviewDomainOrder(context.payload, context.run, domain)
    return { ok: result.messageKey === "checkoutDomainAvailable", message: t(result.messageKey, { domain: result.domain }) }
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : t("checkoutDomainCheckFailed", { domain }),
    }
  }
}

export async function startPreviewCheckoutPaymentAction(
  clientSlug: string,
  _previousState: PreviewCheckoutActionState,
  formData: FormData,
): Promise<PreviewCheckoutActionState> {
  const t = await getTranslations("preview")
  const context = await requirePreviewCheckoutContext(clientSlug)

  const domain = String(formData.get("domain") ?? "").trim().toLowerCase()
  if (!domain) return { ok: false, message: t("checkoutDomainRequired") }

  try {
    const ready = await requireReadyPreviewDomainOrder(context.payload, context.run, domain)
    const approved = await context.payload.update({
      collection: "site-generation-runs",
      id: ready.run.id,
      data: {
        clientApproval: { status: "approved", approvedAt: new Date().toISOString() },
      } as any,
      depth: 0,
      overrideAccess: true,
    }) as typeof context.run
    const checkout = await createMollieCheckoutForGenerationRun(context.payload, {
      runId: approved.id,
      customerEmail: context.customerEmail,
      clientSlug: context.clientSlug,
      selectedDomain: ready.domain,
      actor: context.customerEmail,
    })
    return {
      ok: true,
      message: t("checkoutRedirectingToPayment"),
      checkoutUrl: checkout.checkoutUrl,
    }
  } catch (error) {
    const checkoutErrorKeys = new Set(["checkoutDomainUnavailable", "checkoutDomainPremium", "checkoutDomainCheckFailed"])
    const message = error instanceof Error && checkoutErrorKeys.has(error.message)
      ? t(error.message as "checkoutDomainUnavailable" | "checkoutDomainPremium" | "checkoutDomainCheckFailed", { domain })
      : error instanceof Error
        ? error.message
        : t("checkoutFailed")
    return { ok: false, message }
  }
}
