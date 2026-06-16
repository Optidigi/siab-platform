"use client"
import { OnboardingChecklist as RegistryChecklist } from "@/components/onboarding-checklist"
import type { OnboardingStep } from "@/components/onboarding-checklist"
import { useTranslations } from "next-intl"
import { useStatusFeedback } from "@/components/status-feedback"

// FN-2026-0008 — persist checklist state in localStorage so the multi-day,
// multi-system onboarding work survives reloads. Per-browser, per-tenant.
// Cross-device persistence (e.g. operator switches machines) would require
// a backing store on Tenant; that's the appropriate next step but out of
// scope for this incremental fix.
const SEED: Record<string, boolean> = { "tenant-record": true }

export function OnboardingChecklist({
  tenant,
  vpsIp,
}: {
  tenant: { domain: string; slug: string; id: number | string }
  vpsIp: string
}) {
  const t = useTranslations("onboarding")
  const tApiKey = useTranslations("apiKey")
  const status = useStatusFeedback()
  const npmConfig = JSON.stringify(
    {
      domain_names: [`admin.${tenant.domain}`],
      forward_host: "siab-payload",
      forward_port: 3000,
      block_exploits: true,
      websockets: true,
      ssl_forced: true,
      http2_support: true,
    },
    null,
    2,
  )

  const steps: OnboardingStep[] = [
    {
      id: "tenant-record",
      title: t("siteRecordCreated"),
      description: <span>{t("doneWithId", { id: String(tenant.id) })}</span>,
    },
    {
      id: "dns",
      title: t("addDns"),
      description: <span>{t("dnsDescription", { domain: tenant.domain, ip: vpsIp })}</span>,
      copy: vpsIp,
    },
    {
      id: "npm",
      title: t("configureProxy"),
      description: <span>{t("proxyDescription", { domain: tenant.domain })}</span>,
      copy: npmConfig,
    },
    {
      id: "cert",
      title: t("issueCertificate"),
      description: <span>{t("certificateDescription")}</span>,
    },
    {
      id: "owner",
      title: t("createOwner"),
      description: <span><a href={`/sites/${tenant.slug}/users`} className="underline">{t("openUsers")}</a></span>,
    },
    {
      id: "verify",
      title: t("verifyAccess"),
      description: (
        <span>
          <a href={`https://admin.${tenant.domain}`} className="underline" target="_blank" rel="noopener noreferrer">
            https://admin.{tenant.domain}
          </a>
        </span>
      ),
    },
  ]

  return (
    <RegistryChecklist
      storageKey={`siab.onboarding.${tenant.id}`}
      steps={steps}
      seed={SEED}
      onCopied={() => status.success(tApiKey("copied"))}
    />
  )
}
