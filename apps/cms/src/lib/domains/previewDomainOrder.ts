import "server-only"
import type { Payload } from "payload"
import type { SiteGenerationRun } from "@/payload-types"
import {
  compareMoney,
  createDomainOrderState,
  domainExtraFeeForProviderPrice,
  fixedDomainOrderPriceFromEnv,
  maxDomainProviderPriceFromEnv,
  normalizeDomainOrderState,
  providerPriceWithinCap,
  type FixedDomainOrderPrice,
  type DomainRegistrantDetails,
} from "@/lib/domains/orderState"
import {
  checkOpenProviderDomainAvailability,
  checkOpenProviderDomainsAvailability,
  loginOpenProvider,
  suggestOpenProviderDomains,
} from "@/lib/domains/openprovider"
import { normalizeDomain } from "@/lib/domains/normalize"

export type PreviewDomainSuggestion = {
  domain: string
  included: boolean
  extraFeeAmount: string | null
  extraFeeCurrency: string | null
}

export type PreviewDomainSuggestionBatch = {
  suggestions: PreviewDomainSuggestion[]
  nextCursor: number
  done: boolean
}

export type PreviewDomainOrderResult = {
  run: SiteGenerationRun
  messageKey:
    | "checkoutDomainAvailable"
    | "checkoutDomainUnavailable"
    | "checkoutDomainPremium"
    | "checkoutDomainCheckFailed"
    | "checkoutDomainAvailableExtraFee"
  domain: string
  included: boolean
  extraFeeAmount: string | null
  extraFeeCurrency: string | null
  suggestions: PreviewDomainSuggestion[]
}

export function selectedDomainForCheckout(run: Pick<SiteGenerationRun, "domainOrder">): string | null {
  const state = normalizeDomainOrderState(run.domainOrder)
  return state.status === "ready_to_register" && state.domain ? state.domain : null
}

const suffixModifiers = ["online", "site", "web", "studio", "zorg", "praktijk", "groep", "hq"]
const prefixModifiers = ["mijn", "de", "het"]
const trailingBusinessWords = ["web", "site", "online", "studio", "zorg", "care", "praktijk", "clinic", "groep", "hq"]

const titleCase = (value: string): string => value ? `${value[0]?.toUpperCase() ?? ""}${value.slice(1)}` : value

const suggestionCandidates = (domain: string): string[] => {
  const normalized = normalizeDomain(domain)
  if (!normalized.ok) return []
  const [name, extension] = [normalized.name, normalized.extension]
  const compactName = name.replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")
  if (!compactName) return []

  const candidates = new Set<string>()
  const parts = compactName.split("-").filter(Boolean)
  const joined = parts.join("")
  const spaced = parts.join("-")
  const roots = new Set<string>([compactName, joined, spaced])

  for (const suffix of trailingBusinessWords) {
    for (const root of [...roots]) {
      if (root.endsWith(suffix) && root.length > suffix.length + 2) {
        const trimmed = root.slice(0, -suffix.length).replace(/-+$/g, "")
        if (trimmed) roots.add(trimmed)
      }
    }
  }

  for (const root of roots) {
    candidates.add(`${root}.${extension}`)
    for (const modifier of suffixModifiers) {
      candidates.add(`${root}${modifier}.${extension}`)
      candidates.add(`${root}-${modifier}.${extension}`)
    }
    for (const modifier of prefixModifiers) {
      candidates.add(`${modifier}${root}.${extension}`)
      candidates.add(`${modifier}-${root}.${extension}`)
    }
  }

  if (parts.length > 1) {
    candidates.add(`${[...parts].reverse().join("-")}.${extension}`)
    candidates.add(`${parts.at(0)}${parts.slice(1).map(titleCase).join("")}.${extension}`)
  }
  return [...candidates].filter((candidate) => candidate !== normalized.domain).slice(0, 48)
}

const suggestionForAvailability = (
  domain: string,
  providerPrice: FixedDomainOrderPrice | null,
  includedProviderPrice: FixedDomainOrderPrice,
): PreviewDomainSuggestion => {
  const extraFee = domainExtraFeeForProviderPrice(providerPrice, includedProviderPrice)
  return {
    domain,
    included: !extraFee,
    extraFeeAmount: extraFee?.amount ?? null,
    extraFeeCurrency: extraFee?.currency ?? null,
  }
}

export async function suggestAvailablePreviewDomains(
  domain: string,
  includedProviderPrice: ReturnType<typeof maxDomainProviderPriceFromEnv>,
  token: string,
): Promise<PreviewDomainSuggestion[]> {
  const suggestions: PreviewDomainSuggestion[] = []
  let cursor = 0
  let done = false
  while (!done && suggestions.length < 5) {
    const batch = await suggestAvailablePreviewDomainBatch(domain, includedProviderPrice, token, {
      cursor,
      batchSize: 8,
      existingDomains: suggestions.map((suggestion) => suggestion.domain),
    })
    suggestions.push(...batch.suggestions)
    cursor = batch.nextCursor
    done = batch.done
  }
  return suggestions
}

export async function suggestAvailablePreviewDomainBatch(
  domain: string,
  includedProviderPrice: ReturnType<typeof maxDomainProviderPriceFromEnv>,
  token: string,
  options?: { cursor?: number; batchSize?: number; existingDomains?: string[] },
): Promise<PreviewDomainSuggestionBatch> {
  const normalized = normalizeDomain(domain)
  const suggestions: PreviewDomainSuggestion[] = []
  const existingDomains = new Set(options?.existingDomains ?? [])
  const cursor = Math.max(0, options?.cursor ?? 0)
  const batchSize = Math.max(1, Math.min(options?.batchSize ?? 6, 12))
  if (!normalized.ok) return { suggestions, nextCursor: cursor, done: true }

  try {
    const localCandidates = suggestionCandidates(domain)
    const didLoadProviderCandidates = cursor >= localCandidates.length
    const providerCandidates = didLoadProviderCandidates
      ? await suggestOpenProviderDomains(domain, { token, limit: 12 })
        .then((providerSuggestions) => providerSuggestions.map((suggestion) => suggestion.domain))
        .catch(() => [])
      : []
    const candidates = [...new Set([...localCandidates, ...providerCandidates])].filter((candidate) => {
      const candidateDomain = normalizeDomain(candidate)
      return candidateDomain.ok &&
        candidateDomain.extension === normalized.extension &&
        candidateDomain.domain !== normalized.domain
    })
    const batchCandidates = candidates.slice(cursor, cursor + batchSize)
    if (batchCandidates.length === 0) {
      return { suggestions, nextCursor: candidates.length, done: true }
    }
    const availabilityResults = await checkOpenProviderDomainsAvailability(batchCandidates, { token })
    for (const availability of availabilityResults) {
      const providerPrice = availability.price
        ? { amount: availability.price.amount, currency: availability.price.currency }
        : null
      if (
        availability.status === "available" &&
        !existingDomains.has(availability.domain) &&
        providerPriceIsUsable(providerPrice, includedProviderPrice)
      ) {
        suggestions.push(suggestionForAvailability(availability.domain, providerPrice, includedProviderPrice))
        existingDomains.add(availability.domain)
      }
      if (suggestions.length >= 5) break
    }
    const nextCursor = cursor + batchCandidates.length
    return { suggestions, nextCursor, done: didLoadProviderCandidates && nextCursor >= candidates.length }
  } catch {
    // Suggestions are optional; the primary domain check result remains authoritative.
    return { suggestions, nextCursor: cursor + batchSize, done: false }
  }
}

const providerPriceIsUsable = (
  providerPrice: FixedDomainOrderPrice | null,
  includedProviderPrice: FixedDomainOrderPrice,
): boolean => providerPrice !== null && compareMoney(providerPrice, includedProviderPrice) !== null

export async function checkAndRecordPreviewDomainOrder(
  payload: Payload,
  run: SiteGenerationRun,
  domainInput: string,
  registrant?: DomainRegistrantDetails | null,
  options?: { record?: boolean },
): Promise<PreviewDomainOrderResult> {
  const normalized = normalizeDomain(domainInput)
  if (!normalized.ok) {
    throw new Error(`Invalid domain: ${normalized.reason}`)
  }

  const fixedPrice = fixedDomainOrderPriceFromEnv()
  const includedProviderPrice = maxDomainProviderPriceFromEnv()
  const token = await loginOpenProvider()
  const availability = await checkOpenProviderDomainAvailability(normalized.domain, { token })
  const now = new Date().toISOString()
  const providerPrice = availability.price
    ? { amount: availability.price.amount, currency: availability.price.currency }
    : null
  const priceUsable = availability.status === "available" && providerPriceIsUsable(providerPrice, includedProviderPrice)
  const includedPrice = availability.status === "available" && providerPriceWithinCap(providerPrice, includedProviderPrice)
  const extraFee = domainExtraFeeForProviderPrice(providerPrice, includedProviderPrice)
  const status = priceUsable
    ? "ready_to_register"
    : availability.status === "premium"
      ? "premium"
      : availability.status === "unavailable"
        ? "unavailable"
        : "failed"
  const domainOrder = createDomainOrderState({
    status,
    domain: normalized.domain,
    fixedPrice,
    providerPrice,
    maxProviderPrice: includedProviderPrice,
    registrant: registrant ?? normalizeDomainOrderState(run.domainOrder).registrant,
    reason: availability.internalReason
      ?? (availability.status === "available" && !priceUsable
        ? "provider_price_unavailable"
        : availability.status === "available" && !includedPrice
          ? "domain_cost_above_limit"
          : null),
    now,
  })

  const updated = options?.record === false
    ? run
    : await payload.update({
      collection: "site-generation-runs",
      id: run.id,
      data: { domainOrder } as any,
      depth: 0,
      overrideAccess: true,
    }) as SiteGenerationRun

  return {
    run: updated,
    domain: normalized.domain,
    included: includedPrice,
    extraFeeAmount: extraFee?.amount ?? null,
    extraFeeCurrency: extraFee?.currency ?? null,
    suggestions: [],
    messageKey: includedPrice
      ? "checkoutDomainAvailable"
      : priceUsable
        ? "checkoutDomainAvailableExtraFee"
      : availability.status === "premium"
        ? "checkoutDomainPremium"
        : availability.status === "unavailable"
          ? "checkoutDomainUnavailable"
          : "checkoutDomainCheckFailed",
  }
}

export async function requireReadyPreviewDomainOrder(
  payload: Payload,
  run: SiteGenerationRun,
  domainInput: string,
  registrant?: DomainRegistrantDetails | null,
): Promise<{ run: SiteGenerationRun; domain: string }> {
  const normalized = normalizeDomain(domainInput)
  if (!normalized.ok) throw new Error(`Invalid domain: ${normalized.reason}`)
  const state = normalizeDomainOrderState(run.domainOrder)
  const result = await checkAndRecordPreviewDomainOrder(payload, run, normalized.domain, registrant)
  if (result.messageKey !== "checkoutDomainAvailable" && result.messageKey !== "checkoutDomainAvailableExtraFee") {
    throw new Error(result.messageKey)
  }
  if (state.status !== "ready_to_register" || state.domain !== normalized.domain) {
    return { run: result.run, domain: result.domain }
  }
  return { run: result.run, domain: normalized.domain }
}
