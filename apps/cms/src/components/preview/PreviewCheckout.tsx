"use client"

import * as React from "react"
import { useActionState } from "react"
import { useTranslations } from "next-intl"
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Globe2,
  Loader2,
  Pencil,
  ShieldCheck,
  UserRound,
} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@siteinabox/ui/components/alert"
import { Badge } from "@siteinabox/ui/components/badge"
import { Button } from "@siteinabox/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@siteinabox/ui/components/card"
import { Input } from "@siteinabox/ui/components/input"
import { Label } from "@siteinabox/ui/components/label"
import { Separator } from "@siteinabox/ui/components/separator"
import { cn } from "@siteinabox/ui/lib/utils"
import type { DomainRegistrantDetails } from "@/lib/domains/orderState"

export type PreviewCheckoutDomainOption = {
  domain: string
  included: boolean
  extraFeeAmount: string | null
  extraFeeCurrency: string | null
  extraFeeLabel?: string | null
}

export type PreviewCheckoutActionState = {
  ok: boolean
  message: string
  checkoutUrl?: string
  domain?: string
  included?: boolean
  extraFeeAmount?: string | null
  extraFeeCurrency?: string | null
  extraFeeLabel?: string | null
  totalPriceLabel?: string | null
  suggestions?: PreviewCheckoutDomainOption[]
}

type PreviewCheckoutAction = (
  previousState: PreviewCheckoutActionState,
  formData: FormData,
) => Promise<PreviewCheckoutActionState>

type CheckoutStep = "domain" | "details" | "payment"

type PreviewCheckoutProps = {
  customerEmail: string
  tenantName: string
  currentDomain?: string | null
  domainReady?: boolean
  registrant?: DomainRegistrantDetails | null
  priceLabel: string
  initialExtraFeeLabel?: string | null
  initialTotalPriceLabel?: string | null
  paymentStatus: string
  approvalStatus: string
  previewHref: string
  checkDomainAction: PreviewCheckoutAction
  startPaymentAction: PreviewCheckoutAction
}

const initialState: PreviewCheckoutActionState = {
  ok: false,
  message: "",
}

const emptyRegistrant = (customerEmail: string, registrant?: DomainRegistrantDetails | null): DomainRegistrantDetails => ({
  companyName: registrant?.companyName ?? "",
  firstName: registrant?.firstName ?? "",
  lastName: registrant?.lastName ?? "",
  email: registrant?.email ?? customerEmail,
  street: registrant?.street ?? "",
  number: registrant?.number ?? "",
  suffix: registrant?.suffix ?? "",
  zipcode: registrant?.zipcode ?? "",
  city: registrant?.city ?? "",
  country: registrant?.country ?? "NL",
  state: registrant?.state ?? "",
  phoneCountryCode: registrant?.phoneCountryCode ?? "+31",
  phoneAreaCode: registrant?.phoneAreaCode ?? "",
  phoneSubscriberNumber: registrant?.phoneSubscriberNumber ?? "",
  locale: registrant?.locale ?? "nl_NL",
})

const requiredRegistrantKeys: Array<keyof DomainRegistrantDetails> = [
  "firstName",
  "lastName",
  "email",
  "street",
  "number",
  "zipcode",
  "city",
  "country",
  "phoneCountryCode",
  "phoneAreaCode",
  "phoneSubscriberNumber",
]

export function PreviewCheckout({
  customerEmail,
  tenantName,
  currentDomain,
  domainReady = false,
  registrant,
  priceLabel,
  initialExtraFeeLabel,
  initialTotalPriceLabel,
  paymentStatus,
  approvalStatus,
  previewHref,
  checkDomainAction,
  startPaymentAction,
}: PreviewCheckoutProps) {
  const t = useTranslations("preview")
  const [step, setStep] = React.useState<CheckoutStep>("domain")
  const [checkState, checkAction, checkPending] = useActionState(
    checkDomainAction,
    initialState,
  )
  const [paymentState, paymentAction, paymentPending] = useActionState(
    startPaymentAction,
    initialState,
  )
  const [domainValue, setDomainValue] = React.useState(currentDomain ?? "")
  const [checkedDomain, setCheckedDomain] = React.useState<string | null>(domainReady ? (currentDomain ?? null) : null)
  const [holder, setHolder] = React.useState(() => emptyRegistrant(customerEmail, registrant))

  React.useEffect(() => {
    if (checkState.ok && checkState.domain) {
      setCheckedDomain(checkState.domain)
      setDomainValue(checkState.domain)
    }
  }, [checkState])

  React.useEffect(() => {
    if (paymentState.ok && paymentState.checkoutUrl) {
      window.location.assign(paymentState.checkoutUrl)
    }
  }, [paymentState])

  const selectedDomain = checkedDomain && checkedDomain === domainValue ? checkedDomain : null
  const canContinueFromDomain = Boolean(selectedDomain && (checkState.ok || (domainReady && selectedDomain === currentDomain)))
  const holderComplete = requiredRegistrantKeys.every((key) => String(holder[key] ?? "").trim().length > 0)
  const totalPriceLabel = checkState.totalPriceLabel || initialTotalPriceLabel || priceLabel
  const selectedExtraFeeLabel = checkState.domain === selectedDomain
    ? checkState.extraFeeLabel
    : selectedDomain && domainReady
      ? initialExtraFeeLabel
      : null

  const updateHolder = (key: keyof DomainRegistrantDetails, value: string) => {
    setHolder((current) => ({ ...current, [key]: value }))
  }

  const updateDomain = (value: string) => {
    setDomainValue(value)
    if (value !== checkedDomain) {
      setCheckedDomain(null)
      if (step !== "domain") setStep("domain")
    }
  }

  return (
    <main className="min-h-dvh bg-background text-foreground pb-[max(env(safe-area-inset-bottom),1.5rem)]">
      <header data-siab-cms-sticky-chrome className="sticky top-0 z-30 border-b bg-background">
        <div className="mx-auto flex min-h-14 w-full max-w-7xl items-center gap-3 px-3 py-2 md:min-h-12 md:px-4">
          <a href={previewHref} className="flex min-w-0 items-center gap-2">
            <img src="/logos/logo-light.svg" alt="Site in a Box" className="h-7 w-auto dark:hidden" />
            <img src="/logos/logo-dark.svg" alt="Site in a Box" className="hidden h-7 w-auto dark:block" />
          </a>
          <Separator orientation="vertical" className="hidden h-5 sm:block" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-medium text-foreground">{t("checkoutTitle")}</h1>
            <p className="truncate text-xs text-muted-foreground">
              {t("checkoutDescription", { site: tenantName })}
            </p>
          </div>
          <Badge variant="outline" className="hidden shrink-0 sm:inline-flex">
            <ShieldCheck className="size-3" aria-hidden />
            {t("checkoutSecureBadge")}
          </Badge>
          <Button asChild variant="outline" size="sm" className="shrink-0">
            <a href={previewHref}>
              <ArrowLeft className="size-4" aria-hidden />
              <span className="hidden sm:inline">{t("checkoutBackToPreview")}</span>
            </a>
          </Button>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-7xl gap-4 p-3 md:p-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="grid gap-4">
          <CheckoutStepper step={step} />

          {step === "domain" && (
            <Card>
              <CardHeader>
                <CardTitle>{t("checkoutDomainTitle")}</CardTitle>
                <CardDescription>{t("checkoutDomainStepDescription")}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-5">
                <form action={checkAction} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                  <div className="grid gap-2">
                    <Label htmlFor="checkout-domain">{t("checkoutDomainLabel")}</Label>
                    <Input
                      id="checkout-domain"
                      name="domain"
                      type="text"
                      inputMode="url"
                      autoComplete="url"
                      value={domainValue}
                      onChange={(event) => updateDomain(event.target.value)}
                      placeholder={t("checkoutDomainPlaceholder")}
                      required
                    />
                  </div>
                  <Button type="submit" variant="outline" disabled={checkPending}>
                    {checkPending ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : (
                      <Globe2 className="size-4" aria-hidden />
                    )}
                    {t("checkoutCheckDomain")}
                  </Button>
                </form>

                {checkPending && (
                  <Alert>
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    <AlertTitle>{t("checkoutDomainCheckingTitle")}</AlertTitle>
                    <AlertDescription>{t("checkoutDomainCheckingDescription")}</AlertDescription>
                  </Alert>
                )}

                {checkState.message && !checkPending && (
                  <Alert variant={checkState.ok ? "default" : "destructive"}>
                    <AlertTitle>{checkState.ok ? t("checkoutDomainCheckTitle") : t("accessUnavailable")}</AlertTitle>
                    <AlertDescription className="grid gap-3">
                      <span>{checkState.message}</span>
                      {checkState.ok && selectedDomain && (
                        <DomainOptionRow
                          option={{
                            domain: selectedDomain,
                            included: Boolean(checkState.included),
                            extraFeeAmount: checkState.extraFeeAmount ?? null,
                            extraFeeCurrency: checkState.extraFeeCurrency ?? null,
                            extraFeeLabel: checkState.extraFeeLabel,
                          }}
                          selected
                        />
                      )}
                      <DomainSuggestions suggestions={checkState.suggestions} onSelect={updateDomain} />
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex justify-end">
                  <Button type="button" disabled={!canContinueFromDomain} onClick={() => setStep("details")}>
                    <CheckCircle2 className="size-4" aria-hidden />
                    {t("checkoutNext")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {step === "details" && (
            <Card>
              <CardHeader>
                <CardTitle>{t("checkoutDetailsTitle")}</CardTitle>
                <CardDescription>{t("checkoutDetailsDescription")}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6">
                <ReviewRow label={t("checkoutSummaryDomain")} value={selectedDomain ?? domainValue} onEdit={() => setStep("domain")} />
                <DomainHolderFields holder={holder} onChange={updateHolder} />
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                  <Button type="button" variant="outline" onClick={() => setStep("domain")}>
                    {t("checkoutBack")}
                  </Button>
                  <Button type="button" disabled={!holderComplete || !selectedDomain} onClick={() => setStep("payment")}>
                    {t("checkoutNext")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {step === "payment" && (
            <Card>
              <CardHeader>
                <CardTitle>{t("checkoutPaymentTitle")}</CardTitle>
                <CardDescription>{t("checkoutPaymentStepDescription")}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-5">
                <div className="grid gap-3 rounded-md border p-4 text-sm">
                  <ReviewRow label={t("checkoutSummaryDomain")} value={selectedDomain ?? domainValue} onEdit={() => setStep("domain")} />
                  <ReviewRow label={t("checkoutRegistrantTitle")} value={holder.companyName || `${holder.firstName} ${holder.lastName}`.trim()} onEdit={() => setStep("details")} />
                  <ReviewRow label={t("checkoutSummaryTotal")} value={totalPriceLabel} />
                </div>
                <Alert>
                  <ShieldCheck className="size-4" aria-hidden />
                  <AlertTitle>{t("checkoutRenewalTitle")}</AlertTitle>
                  <AlertDescription>{t("checkoutDomainSubmitDescription")}</AlertDescription>
                </Alert>
                <form action={paymentAction} className="grid gap-3">
                  <CheckoutHiddenInputs domain={selectedDomain ?? domainValue} holder={holder} />
                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                    <Button type="button" variant="outline" onClick={() => setStep("details")}>
                      {t("checkoutBack")}
                    </Button>
                    <Button type="submit" disabled={paymentPending || !holderComplete || !selectedDomain}>
                      {paymentPending ? (
                        <Loader2 className="size-4 animate-spin" aria-hidden />
                      ) : (
                        <CreditCard className="size-4" aria-hidden />
                      )}
                      {t("checkoutStartPayment")}
                    </Button>
                  </div>
                </form>
                {paymentState.message && (
                  <Alert variant={paymentState.ok ? "default" : "destructive"}>
                    <AlertTitle>{paymentState.ok ? t("checkoutPaymentStartingTitle") : t("accessUnavailable")}</AlertTitle>
                    <AlertDescription>{paymentState.message}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}
        </section>

        <aside className="grid h-fit gap-4 lg:sticky lg:top-20">
          <Card>
            <CardHeader>
              <CardTitle>{t("checkoutSummaryTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm">
              <div className="grid gap-1">
                <div className="text-muted-foreground">{t("checkoutSummaryProduct")}</div>
                <div className="font-medium">{t("checkoutSummaryProductName")}</div>
              </div>
              <div className="grid gap-1">
                <div className="text-muted-foreground">{t("checkoutSummaryCustomer")}</div>
                <div className="break-all font-medium">{customerEmail}</div>
              </div>
              <div className="grid gap-1">
                <div className="text-muted-foreground">{t("checkoutSummaryDomain")}</div>
                <div className="break-all font-medium">{selectedDomain || domainValue || currentDomain || t("checkoutDomainUnset")}</div>
                {selectedExtraFeeLabel && (
                  <div className="text-xs text-muted-foreground">{t("checkoutDomainExtraFeeInline", { extraFee: selectedExtraFeeLabel })}</div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 border-t pt-4">
                <div className="text-muted-foreground">{t("checkoutSummaryApproval")}</div>
                <Badge variant={approvalStatus === "approved" ? "success" : "secondary"}>
                  {approvalStatus === "approved" ? t("approved") : t("pendingApproval")}
                </Badge>
                <div className="text-muted-foreground">{t("checkoutSummaryPayment")}</div>
                <Badge variant={paymentStatus === "completed" ? "success" : "secondary"}>
                  {formatPaymentStatus(paymentStatus, t)}
                </Badge>
              </div>
              <div className="flex items-center justify-between border-t pt-4 text-base">
                <span className="font-medium">{t("checkoutSummaryTotal")}</span>
                <span className="font-semibold">{totalPriceLabel}</span>
              </div>
              <p className="text-xs text-muted-foreground">{t("checkoutPaymentDescription")}</p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </main>
  )
}

function CheckoutStepper({ step }: { step: CheckoutStep }) {
  const t = useTranslations("preview")
  const steps: Array<{ id: CheckoutStep; label: string; icon: React.ElementType }> = [
    { id: "domain", label: t("checkoutStepDomain"), icon: Globe2 },
    { id: "details", label: t("checkoutStepDetails"), icon: UserRound },
    { id: "payment", label: t("checkoutStepPayment"), icon: CreditCard },
  ]
  const activeIndex = steps.findIndex((entry) => entry.id === step)
  return (
    <Card className="py-4">
      <CardContent className="px-4">
        <ol className="grid gap-2 sm:grid-cols-3">
          {steps.map((entry, index) => {
            const Icon = entry.icon
            const active = index === activeIndex
            const complete = index < activeIndex
            return (
              <li
                key={entry.id}
                className={cn(
                  "flex items-center gap-3 rounded-md border px-3 py-2 text-sm",
                  active && "border-primary bg-primary/5",
                  complete && "border-border bg-muted/40",
                )}
              >
                <span className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs",
                  active && "border-primary bg-primary text-primary-foreground",
                  complete && "border-primary text-primary",
                )}>
                  {complete ? <CheckCircle2 className="size-4" aria-hidden /> : <Icon className="size-4" aria-hidden />}
                </span>
                <span className="truncate font-medium">{entry.label}</span>
              </li>
            )
          })}
        </ol>
      </CardContent>
    </Card>
  )
}

function DomainOptionRow({ option, selected }: { option: PreviewCheckoutDomainOption; selected?: boolean }) {
  const t = useTranslations("preview")
  return (
    <div className={cn("flex flex-col gap-2 rounded-md border bg-background p-3 sm:flex-row sm:items-center sm:justify-between", selected && "border-primary")}>
      <div className="grid gap-1">
        <div className="break-all text-sm font-medium text-foreground">{option.domain}</div>
        <div className="text-xs text-muted-foreground">
          {option.included || !option.extraFeeLabel
            ? t("checkoutDomainIncluded")
            : t("checkoutDomainExtraFeeInline", { extraFee: option.extraFeeLabel })}
        </div>
      </div>
      {selected && <Badge variant={option.included ? "success" : "secondary"}>{option.included ? t("checkoutDomainIncludedBadge") : t("checkoutDomainExtraFeeBadge")}</Badge>}
    </div>
  )
}

function DomainSuggestions({ suggestions, onSelect }: { suggestions?: PreviewCheckoutDomainOption[]; onSelect: (domain: string) => void }) {
  const t = useTranslations("preview")
  if (!suggestions?.length) return null
  return (
    <div className="grid gap-2">
      <div className="text-sm font-medium text-foreground">{t("checkoutDomainSuggestionsTitle")}</div>
      <div className="grid gap-2">
        {suggestions.map((option) => (
          <Button
            key={option.domain}
            type="button"
            variant="outline"
            className="h-auto w-full justify-start whitespace-normal p-3 text-left"
            onClick={() => onSelect(option.domain)}
          >
            <span className="grid gap-1">
              <span className="break-all text-sm font-medium text-foreground">{option.domain}</span>
              <span className="text-xs text-muted-foreground">
                {option.included || !option.extraFeeLabel
                  ? t("checkoutDomainIncluded")
                  : t("checkoutDomainExtraFeeInline", { extraFee: option.extraFeeLabel })}
              </span>
            </span>
          </Button>
        ))}
      </div>
    </div>
  )
}

function ReviewRow({ label, value, onEdit }: { label: string; value: string; onEdit?: () => void }) {
  const t = useTranslations("preview")
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="grid gap-1">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="break-words text-sm font-medium">{value || "-"}</div>
      </div>
      {onEdit && (
        <Button type="button" variant="ghost" size="sm" onClick={onEdit}>
          <Pencil className="size-4" aria-hidden />
          {t("checkoutEdit")}
        </Button>
      )}
    </div>
  )
}

function DomainHolderFields({
  holder,
  onChange,
}: {
  holder: DomainRegistrantDetails
  onChange: (key: keyof DomainRegistrantDetails, value: string) => void
}) {
  const t = useTranslations("preview")
  return (
    <div className="grid gap-4 rounded-md border p-4">
      <div className="grid gap-1">
        <h2 className="text-sm font-medium">{t("checkoutRegistrantTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("checkoutRegistrantDescription")}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <TextField id="checkout-company-name" label={t("checkoutCompanyName")} value={holder.companyName ?? ""} autoComplete="organization" onChange={(value) => onChange("companyName", value)} />
        <TextField id="checkout-registrant-email" label={t("checkoutRegistrantEmail")} value={holder.email} type="email" autoComplete="email" required onChange={(value) => onChange("email", value)} />
        <TextField id="checkout-first-name" label={t("checkoutFirstName")} value={holder.firstName} autoComplete="given-name" required onChange={(value) => onChange("firstName", value)} />
        <TextField id="checkout-last-name" label={t("checkoutLastName")} value={holder.lastName} autoComplete="family-name" required onChange={(value) => onChange("lastName", value)} />
        <TextField id="checkout-street" label={t("checkoutStreet")} value={holder.street} autoComplete="address-line1" required onChange={(value) => onChange("street", value)} />
        <div className="grid grid-cols-[1fr_1fr] gap-3">
          <TextField id="checkout-number" label={t("checkoutHouseNumber")} value={holder.number} required onChange={(value) => onChange("number", value)} />
          <TextField id="checkout-suffix" label={t("checkoutHouseSuffix")} value={holder.suffix ?? ""} onChange={(value) => onChange("suffix", value)} />
        </div>
        <TextField id="checkout-zipcode" label={t("checkoutZipcode")} value={holder.zipcode} autoComplete="postal-code" required onChange={(value) => onChange("zipcode", value)} />
        <TextField id="checkout-city" label={t("checkoutCity")} value={holder.city} autoComplete="address-level2" required onChange={(value) => onChange("city", value)} />
        <TextField id="checkout-country" label={t("checkoutCountry")} value={holder.country} autoComplete="country" required onChange={(value) => onChange("country", value.toUpperCase())} />
        <TextField id="checkout-state" label={t("checkoutState")} value={holder.state ?? ""} autoComplete="address-level1" onChange={(value) => onChange("state", value)} />
        <div className="grid grid-cols-[5rem_1fr_1fr] gap-3 md:col-span-2">
          <TextField id="checkout-phone-country" label={t("checkoutPhoneCountry")} value={holder.phoneCountryCode} required onChange={(value) => onChange("phoneCountryCode", value)} />
          <TextField id="checkout-phone-area" label={t("checkoutPhoneArea")} value={holder.phoneAreaCode} inputMode="tel" required onChange={(value) => onChange("phoneAreaCode", value)} />
          <TextField id="checkout-phone-number" label={t("checkoutPhoneNumber")} value={holder.phoneSubscriberNumber} inputMode="tel" required onChange={(value) => onChange("phoneSubscriberNumber", value)} />
        </div>
      </div>
    </div>
  )
}

function TextField({
  id,
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  inputMode,
  required,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  autoComplete?: string
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"]
  required?: boolean
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        autoComplete={autoComplete}
        inputMode={inputMode}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  )
}

function CheckoutHiddenInputs({ domain, holder }: { domain: string; holder: DomainRegistrantDetails }) {
  return (
    <>
      <input type="hidden" name="domain" value={domain} />
      <input type="hidden" name="companyName" value={holder.companyName ?? ""} />
      <input type="hidden" name="registrantEmail" value={holder.email} />
      <input type="hidden" name="firstName" value={holder.firstName} />
      <input type="hidden" name="lastName" value={holder.lastName} />
      <input type="hidden" name="street" value={holder.street} />
      <input type="hidden" name="number" value={holder.number} />
      <input type="hidden" name="suffix" value={holder.suffix ?? ""} />
      <input type="hidden" name="zipcode" value={holder.zipcode} />
      <input type="hidden" name="city" value={holder.city} />
      <input type="hidden" name="country" value={holder.country} />
      <input type="hidden" name="state" value={holder.state ?? ""} />
      <input type="hidden" name="phoneCountryCode" value={holder.phoneCountryCode} />
      <input type="hidden" name="phoneAreaCode" value={holder.phoneAreaCode} />
      <input type="hidden" name="phoneSubscriberNumber" value={holder.phoneSubscriberNumber} />
    </>
  )
}

function formatPaymentStatus(status: string, t: ReturnType<typeof useTranslations<"preview">>): string {
  switch (status) {
    case "completed":
      return t("paymentCompleted")
    case "waived":
      return t("paymentWaived")
    case "pending_provider":
      return t("paymentPendingProvider")
    case "not_started":
      return t("paymentNotStarted")
    default:
      return status.replace(/_/g, " ")
  }
}
