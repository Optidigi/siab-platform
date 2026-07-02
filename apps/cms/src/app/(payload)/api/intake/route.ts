import { NextResponse, type NextRequest } from "next/server"
import { getPayload } from "payload"
import { hasUnvalidatedAuthSignal } from "@/access/authSignals"
import { parsePublicIntakeSubmission } from "@/lib/intake/publicIntakeValidation"
import { processStoredIntakeSubmission } from "@/lib/intake/processIntakeSubmission"
import { storeIntakeSubmission } from "@/lib/intake/storeIntakeSubmission"
import config from "@/payload.config"

const MAX_INTAKE_BYTES = 64 * 1024

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value)

export async function POST(req: NextRequest) {
  const payload = await getPayload({ config })
  let user: unknown = null
  try {
    const auth = await payload.auth({ headers: req.headers })
    user = auth.user
  } catch {
    user = null
  }
  if (!user && hasUnvalidatedAuthSignal(req)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }

  const contentLength = Number(req.headers.get("content-length") ?? 0)
  if (Number.isFinite(contentLength) && contentLength > MAX_INTAKE_BYTES) {
    return NextResponse.json({ message: "Intake payload too large" }, { status: 413 })
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

  const validated = parsePublicIntakeSubmission(body)
  if (!validated.ok) {
    return NextResponse.json(
      { message: validated.message, issues: validated.issues },
      { status: 400 },
    )
  }

  const storageResult = await storeIntakeSubmission(payload, validated.intake)
  const result = storageResult.ok && storageResult.intakeSubmissionId
    ? await processStoredIntakeSubmission(payload, storageResult.intakeSubmissionId)
    : storageResult

  return NextResponse.json(
    {
      ok: result.ok,
      reused: result.reused,
      status: result.status,
      intakeSubmissionId: result.intakeSubmissionId,
      generationRunId: "generationRunId" in result ? result.generationRunId : undefined,
      tenantId: "tenantId" in result ? result.tenantId : undefined,
      pageIds: "pageIds" in result ? result.pageIds : undefined,
      settingsId: "settingsId" in result ? result.settingsId : undefined,
      error: result.error,
    },
    { status: result.ok ? 202 : 422 },
  )
}
