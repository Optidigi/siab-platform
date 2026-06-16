import { requireSuperAdminSelectedSite } from "@/lib/routePolicy"
import { OnboardingChecklist } from "@/components/onboarding/OnboardingChecklist"
import { PageHeader } from "@/components/page-header"
import { TenantPill } from "@/components/layout/TenantPill"
import { getAdminTranslations } from "@/i18n/admin"

export default async function OnboardingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { user, tenant } = await requireSuperAdminSelectedSite(slug)
  const t = await getAdminTranslations(user, "onboarding")
  const vpsIp = process.env.NEXT_PUBLIC_VPS_IP ?? "set NEXT_PUBLIC_VPS_IP"
  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <PageHeader
        title={t("title")}
        beforeTitle={<TenantPill tenant={{ name: tenant.name, slug: tenant.slug }} />}
        subtitle={t("subtitle", { domain: tenant.domain })}
      />
      <OnboardingChecklist
        tenant={{ id: tenant.id, slug: tenant.slug, domain: tenant.domain ?? "" }}
        vpsIp={vpsIp}
      />
    </div>
  )
}
