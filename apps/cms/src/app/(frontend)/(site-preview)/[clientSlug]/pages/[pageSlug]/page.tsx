import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { renderPreviewRoute } from "@/lib/preview/renderPreviewRoute"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("preview")
  return { title: t("metadataTitle") }
}

export default async function ClientPreviewPage({
  params,
}: {
  params: Promise<{ clientSlug: string; pageSlug: string }>
}) {
  const { clientSlug, pageSlug } = await params
  return renderPreviewRoute({ clientSlug, pageSlug })
}
