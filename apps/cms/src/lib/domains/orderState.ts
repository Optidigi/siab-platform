import "server-only"

export const domainOrderStatuses = [
  "not_started",
  "availability_checked",
  "unavailable",
  "premium",
  "ready_to_register",
  "registration_requested",
  "registered",
  "failed",
] as const

export type DomainOrderStatus = (typeof domainOrderStatuses)[number]

export type DomainOrderState = {
  status: DomainOrderStatus
  domain: string | null
  provider: "openprovider" | null
  fixedPriceAmount: string | null
  fixedPriceCurrency: string | null
  providerPriceAmount: string | null
  providerPriceCurrency: string | null
  providerReference: string | null
  reason: string | null
  checkedAt: string | null
  requestedAt: string | null
  registeredAt: string | null
  updatedAt: string | null
}

export type FixedDomainOrderPrice = {
  amount: string
  currency: string
}

const isDomainOrderStatus = (value: unknown): value is DomainOrderStatus =>
  domainOrderStatuses.includes(value as DomainOrderStatus)

const cleanText = (value: unknown): string | null => {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

const cleanProvider = (value: unknown): "openprovider" | null =>
  value === "openprovider" ? "openprovider" : null

export function fixedDomainOrderPriceFromEnv(env: NodeJS.ProcessEnv = process.env): FixedDomainOrderPrice {
  const amount = cleanText(env.OPENPROVIDER_DOMAIN_FIXED_PRICE_AMOUNT) ?? cleanText(env.MOLLIE_SITE_PAYMENT_AMOUNT)
  const currency = cleanText(env.OPENPROVIDER_DOMAIN_FIXED_PRICE_CURRENCY) ?? cleanText(env.MOLLIE_SITE_PAYMENT_CURRENCY) ?? "EUR"
  if (!amount) throw new Error("MOLLIE_SITE_PAYMENT_AMOUNT is required for domain orders.")
  if (!/^\d+\.\d{2}$/.test(amount)) {
    throw new Error("Domain order price must use decimal format, for example 228.00.")
  }
  return { amount, currency }
}

export function normalizeDomainOrderState(value: unknown): DomainOrderState {
  const source = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}

  return {
    status: isDomainOrderStatus(source.status) ? source.status : "not_started",
    domain: cleanText(source.domain),
    provider: cleanProvider(source.provider),
    fixedPriceAmount: cleanText(source.fixedPriceAmount),
    fixedPriceCurrency: cleanText(source.fixedPriceCurrency),
    providerPriceAmount: cleanText(source.providerPriceAmount),
    providerPriceCurrency: cleanText(source.providerPriceCurrency),
    providerReference: cleanText(source.providerReference),
    reason: cleanText(source.reason),
    checkedAt: cleanText(source.checkedAt),
    requestedAt: cleanText(source.requestedAt),
    registeredAt: cleanText(source.registeredAt),
    updatedAt: cleanText(source.updatedAt),
  }
}

export function createDomainOrderState(input: {
  status: DomainOrderStatus
  domain: string
  fixedPrice?: FixedDomainOrderPrice | null
  providerPrice?: FixedDomainOrderPrice | null
  providerReference?: string | null
  reason?: string | null
  now?: string
}): DomainOrderState {
  const now = input.now ?? new Date().toISOString()
  return {
    status: input.status,
    domain: input.domain,
    provider: "openprovider",
    fixedPriceAmount: input.fixedPrice?.amount ?? null,
    fixedPriceCurrency: input.fixedPrice?.currency ?? null,
    providerPriceAmount: input.providerPrice?.amount ?? null,
    providerPriceCurrency: input.providerPrice?.currency ?? null,
    providerReference: cleanText(input.providerReference),
    reason: cleanText(input.reason),
    checkedAt: ["availability_checked", "unavailable", "premium", "ready_to_register"].includes(input.status) ? now : null,
    requestedAt: input.status === "registration_requested" ? now : null,
    registeredAt: input.status === "registered" ? now : null,
    updatedAt: now,
  }
}
