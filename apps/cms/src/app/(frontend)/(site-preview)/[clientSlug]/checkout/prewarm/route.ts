import { NextRequest, NextResponse } from "next/server"
import { loginOpenProvider } from "@/lib/domains/openprovider"
import { logPreviewCheckoutTiming, startPreviewCheckoutTimer } from "@/lib/preview/domainCheckoutTiming"
import { requirePreviewCheckoutContext } from "../previewCheckoutContext"

export async function POST(request: NextRequest, context: { params: Promise<{ clientSlug: string }> }) {
  const totalStart = startPreviewCheckoutTimer()
  const { clientSlug } = await context.params
  const authStart = startPreviewCheckoutTimer()
  const previewContext = await requirePreviewCheckoutContext(clientSlug, request.headers).catch(() => null)
  if (!previewContext) {
    logPreviewCheckoutTiming("prewarm_auth", authStart, { clientSlug }, { ok: false })
    return NextResponse.json({ ok: false }, { status: 401 })
  }
  logPreviewCheckoutTiming("prewarm_auth", authStart, { clientSlug: previewContext.clientSlug })

  try {
    const providerStart = startPreviewCheckoutTimer()
    await loginOpenProvider()
    logPreviewCheckoutTiming("prewarm_openprovider", providerStart, { clientSlug: previewContext.clientSlug })
    logPreviewCheckoutTiming("prewarm_total", totalStart, { clientSlug: previewContext.clientSlug }, { ok: true })
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error("Preview checkout prewarm failed", error instanceof Error ? error.message : "unknown")
    logPreviewCheckoutTiming("prewarm_total", totalStart, { clientSlug: previewContext.clientSlug }, { ok: false })
    return NextResponse.json({ ok: false }, { status: 200 })
  }
}
