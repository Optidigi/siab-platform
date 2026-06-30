import { headers } from "next/headers"
import { getTranslations } from "next-intl/server"
import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@siteinabox/ui/components/card"
import { PreviewCustomizer } from "@/components/preview/PreviewCustomizer"
import { PreviewLoginForm } from "@/components/preview/PreviewLoginForm"
import { previewAuth } from "@/lib/preview/betterAuth"
import { getPreviewCustomizerDataForGrant } from "@/lib/preview/customizer"
import { isPreviewHost } from "@/lib/preview/previewHost"
import { normalizePreviewClientSlug } from "@/lib/preview/previewAccess"

export async function renderPreviewRoute({
  clientSlug,
  pageSlug,
}: {
  clientSlug: string
  pageSlug?: string | null
}) {
  if (!(await isPreviewHost())) notFound()
  const t = await getTranslations("preview")
  const normalizedClientSlug = normalizePreviewClientSlug(clientSlug)
  if (!normalizedClientSlug) notFound()

  const headerStore = await headers()
  const nonce = headerStore.get("x-csp-nonce") ?? undefined
  const callbackPath = pageSlug
    ? `/${normalizedClientSlug}/pages/${encodeURIComponent(pageSlug)}`
    : `/${normalizedClientSlug}`
  const session = await previewAuth.api.getSession({
    headers: headerStore,
    query: { disableCookieCache: true },
  })
  const customerEmail = session?.user?.email

  if (!customerEmail) {
    return (
      <PreviewAccessScreen
        clientSlug={normalizedClientSlug}
        callbackPath={callbackPath}
        title={t("loginTitle")}
        description={t("loginDescription")}
      />
    )
  }

  try {
    const data = await getPreviewCustomizerDataForGrant({
      clientSlug: normalizedClientSlug,
      customerEmail,
      requestedPage: pageSlug,
    })
    return (
      <>
        {data.tenantCss && (
          <style
            nonce={nonce}
            suppressHydrationWarning
            data-rt-tenant-css
            dangerouslySetInnerHTML={{ __html: data.tenantCss }}
          />
        )}
        <PreviewCustomizer
          access={data.access}
          pages={data.pages}
          page={data.currentPage}
          settings={data.settings}
          manifest={data.manifest}
          theme={data.theme}
          approval={data.approval}
          payment={data.payment}
          tenantSlug={data.tenant.slug}
          domain={data.tenant.domain}
        />
      </>
    )
  } catch {
    return (
      <PreviewAccessScreen
        clientSlug={normalizedClientSlug}
        callbackPath={callbackPath}
        title={t("accessUnavailableTitle")}
        description={t("accessUnavailableDescription")}
      />
    )
  }
}

function PreviewAccessScreen({
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
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-10 text-foreground">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <p className="text-sm text-muted-foreground">{description}</p>
          <PreviewLoginForm clientSlug={clientSlug} callbackPath={callbackPath} />
        </CardContent>
      </Card>
    </main>
  )
}
