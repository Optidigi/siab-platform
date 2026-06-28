import { NextResponse, type NextRequest } from "next/server"
import { getPayload } from "payload"
import config from "@/payload.config"
import { activatePublishedSnapshot, publishSiteSnapshot } from "@/lib/publish/siteSnapshots"
import { publishCurrentTenantState } from "@/lib/publish/currentState"

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value)

const asId = (value: unknown): string | number | null =>
  typeof value === "string" || typeof value === "number" ? value : null

const isCurrentStatePublish = (body: Record<string, unknown>): boolean =>
  body.action !== "rollback" &&
  body.includeAllPublishedPages === true &&
  body.activate === true &&
  asId(body.generationRunId) == null

export async function POST(req: NextRequest) {
  const payload = await getPayload({ config })
  let auth: Awaited<ReturnType<typeof payload.auth>> | null = null
  try {
    auth = await payload.auth({ headers: req.headers })
  } catch {
    auth = null
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 })
  }
  if (!isRecord(body)) {
    return NextResponse.json({ message: "JSON object body required" }, { status: 400 })
  }
  const tenantId = asId(body.tenantId)
  const user = auth?.user
  if (!user) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }

  try {
    if (body.action === "rollback") {
      if (user.role !== "super-admin") {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 })
      }
      const snapshotId = asId(body.snapshotId)
      if (snapshotId == null) return NextResponse.json({ message: "snapshotId is required" }, { status: 400 })
      const snapshot = await activatePublishedSnapshot(payload, {
        snapshotId,
        manualActivation: body.manualActivation === true,
        activatedBy: user.id,
        activationReason: typeof body.reason === "string" ? body.reason : "manual rollback",
        rollback: true,
      })
      return NextResponse.json({ ok: true, activated: true, snapshotId: snapshot.id })
    }

    if (tenantId == null) return NextResponse.json({ message: "tenantId is required" }, { status: 400 })

    if (isCurrentStatePublish(body)) {
      const result = await publishCurrentTenantState(payload, {
        tenantId,
        user,
        reason: typeof body.reason === "string" ? body.reason : null,
      })
      return NextResponse.json({
        ok: true,
        activated: result.activated,
        snapshotId: result.snapshot.id,
        status: result.snapshot.status,
        version: result.snapshot.version,
        domain: result.snapshot.domain,
      })
    }

    if (user.role !== "super-admin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    const result = await publishSiteSnapshot(payload, {
      tenantId,
      generationRunId: asId(body.generationRunId),
      includeAllPublishedPages: body.includeAllPublishedPages === true,
      activate: body.activate === true,
      manualActivation: body.manualActivation === true,
      publishedBy: user.id,
      activationReason: typeof body.reason === "string" ? body.reason : null,
    })

    return NextResponse.json({
      ok: true,
      activated: result.activated,
      snapshotId: result.snapshot.id,
      status: result.snapshot.status,
      version: result.snapshot.version,
      domain: result.snapshot.domain,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Publish failed"
    if (/^Forbidden\b/i.test(message)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }
    return NextResponse.json({ ok: false, message }, { status: 422 })
  }
}
