import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/domains/openprovider", () => ({
  checkOpenProviderDomainAvailability: vi.fn(),
  suggestOpenProviderDomains: vi.fn(),
}))

import { checkOpenProviderDomainAvailability, suggestOpenProviderDomains } from "@/lib/domains/openprovider"
import { checkAndRecordPreviewDomainOrder } from "@/lib/domains/previewDomainOrder"

describe("preview domain order", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv("MOLLIE_SITE_PAYMENT_AMOUNT", "228.00")
    vi.stubEnv("MOLLIE_SITE_PAYMENT_CURRENCY", "EUR")
    vi.stubEnv("OPENPROVIDER_DOMAIN_MAX_COST_AMOUNT", "10.00")
    vi.stubEnv("OPENPROVIDER_DOMAIN_MAX_COST_CURRENCY", "EUR")
    vi.stubEnv("OPENPROVIDER_DOMAIN_MAX_OFFER_AMOUNT", "25.00")
    vi.stubEnv("OPENPROVIDER_DOMAIN_MAX_OFFER_CURRENCY", "EUR")
    vi.mocked(suggestOpenProviderDomains).mockResolvedValue([])
  })

  it("suggests only available same-extension alternative domains within the offer cap", async () => {
    const run = {
      id: 123,
      domainOrder: null,
    }
    const payload = {
      update: vi.fn(async ({ data }: any) => {
        Object.assign(run, data)
        return { ...run }
      }),
    }

    vi.mocked(checkOpenProviderDomainAvailability).mockImplementation(async (domain: string) => {
      if (domain === "acme.nl") {
        return {
          status: "unavailable",
          domain,
          available: false,
          premium: false,
          price: null,
          internalReason: null,
        }
      }
      if (domain === "acmesite.nl") {
        return {
          status: "available",
          domain,
          available: true,
          premium: false,
          price: { amount: "5.95", currency: "EUR" },
          internalReason: null,
        }
      }
      if (domain === "acme-online.nl") {
        return {
          status: "available",
          domain,
          available: true,
          premium: false,
          price: { amount: "6.50", currency: "EUR" },
          internalReason: null,
        }
      }
      return {
        status: "available",
        domain,
        available: true,
        premium: false,
        price: { amount: "26.00", currency: "EUR" },
        internalReason: null,
      }
    })
    vi.mocked(suggestOpenProviderDomains).mockResolvedValue([
      { domain: "acmesite.nl", name: "acmesite", extension: "nl" },
      { domain: "acme-online.nl", name: "acme-online", extension: "nl" },
      { domain: "acme-expensive.nl", name: "acme-expensive", extension: "nl" },
      { domain: "acme.com", name: "acme", extension: "com" },
    ])

    const result = await checkAndRecordPreviewDomainOrder(payload as any, run as any, "acme.nl")

    expect(result).toMatchObject({
      messageKey: "checkoutDomainUnavailable",
      domain: "acme.nl",
      suggestions: [
        { domain: "acmesite.nl", included: true, extraFeeAmount: null, extraFeeCurrency: null },
        { domain: "acme-online.nl", included: true, extraFeeAmount: null, extraFeeCurrency: null },
      ],
    })
    expect(run.domainOrder).toMatchObject({
      status: "unavailable",
      domain: "acme.nl",
      maxProviderPriceAmount: "10.00",
      maxProviderPriceCurrency: "EUR",
      maxOfferPriceAmount: "25.00",
      maxOfferPriceCurrency: "EUR",
    })
  })

  it("marks available domains above the included cap as ready with an extra fee", async () => {
    const run = { id: 123, domainOrder: null }
    const payload = {
      update: vi.fn(async ({ data }: any) => {
        Object.assign(run, data)
        return { ...run }
      }),
    }

    vi.mocked(checkOpenProviderDomainAvailability).mockResolvedValue({
      status: "available",
      domain: "levelweb.nl",
      available: true,
      premium: false,
      price: { amount: "12.50", currency: "EUR" },
      internalReason: null,
    })

    const result = await checkAndRecordPreviewDomainOrder(payload as any, run as any, "levelweb.nl")

    expect(result).toMatchObject({
      messageKey: "checkoutDomainAvailableExtraFee",
      domain: "levelweb.nl",
      included: false,
      extraFeeAmount: "2.50",
      extraFeeCurrency: "EUR",
    })
    expect(run.domainOrder).toMatchObject({
      status: "ready_to_register",
      providerPriceAmount: "12.50",
      reason: "domain_cost_above_limit",
    })
  })
})
