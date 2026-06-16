import { redirect } from "next/navigation"
import { requireAuth } from "@/lib/authGate"
import { getOrCreateSiteSettings } from "@/lib/queries/settings"
import { SettingsForm } from "@/components/forms/SettingsForm"
import { PageHeader } from "@/components/page-header"
import { getAdminTranslations } from "@/i18n/admin"
import { resolveSettingsContract } from "@/lib/settingsContract"

export default async function TenantSettingsPage() {
  const { user, ctx } = await requireAuth()
  if (ctx.mode === "super-admin") redirect("/sites")
  if (user.role !== "owner") redirect("/?error=forbidden")
  const t = await getAdminTranslations(user, "app")
  const settings = await getOrCreateSiteSettings(ctx.tenant.id)
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t("settings")} />
      <SettingsForm
        initial={settings}
        canEdit
        settingsContract={resolveSettingsContract(ctx.tenant.siteManifest as any)}
      />
    </div>
  )
}
