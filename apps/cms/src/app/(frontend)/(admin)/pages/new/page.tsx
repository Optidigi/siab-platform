import { redirect } from "next/navigation"
import { requireAuth } from "@/lib/authGate"
import { PageForm } from "@/components/forms/PageForm"
import { PageHeader } from "@/components/page-header"
import { loadTenantManifest } from "@/lib/richText/loadManifest"
import { loadTenantCss } from "@/lib/editor/loadTenantCss"
import { getAdminTranslations } from "@/i18n/admin"
import { getOrCreateSiteSettings } from "@/lib/queries/settings"
import { listPages } from "@/lib/queries/pages"
import { settingsToJson } from "@/lib/projection/settingsToJson"
import { resolveSettingsContract } from "@/lib/settingsContract"

export default async function NewTenantPage() {
  const { ctx, user } = await requireAuth()
  if (ctx.mode === "super-admin") redirect("/sites")
  if (user.role === "viewer") redirect("/?error=forbidden")
  const t = await getAdminTranslations(user, "pages")
  const [manifest, tenantCss, settings, pages] = await Promise.all([
    loadTenantManifest(ctx.tenant.id),
    loadTenantCss(ctx.tenant.id),
    getOrCreateSiteSettings(ctx.tenant.id),
    listPages(ctx.tenant.id),
  ])
  const navPages = pages.map((entry: any) => ({ id: entry.id, slug: entry.slug, title: entry.title }))
  const rendererSettings = settingsToJson(
    settings,
    navPages,
    { tenantId: ctx.tenant.id, tenantSlug: ctx.tenant.slug, siteDomain: ctx.tenant.domain },
    { settingsContract: resolveSettingsContract((ctx.tenant.siteManifest as any) ?? null) },
  )
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t("new")} />
      <PageForm
        tenantId={ctx.tenant.id}
        tenantSlug={ctx.tenant.slug}
        baseHref="/pages"
        tenantOrigin={`https://${ctx.tenant.domain}`}
        manifest={manifest}
        tenantCss={tenantCss}
        userEditorMode={user.editorMode ?? null}
        theme={ctx.tenant.theme as any}
        siteSettings={settings}
        rendererSettings={rendererSettings as any}
        canEditSettings={user.role === "owner" || user.role === "super-admin"}
      />
    </div>
  )
}
