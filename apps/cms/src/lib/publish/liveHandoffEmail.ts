import "server-only"

import type { Payload } from "payload"
import type { SiteGenerationRun, Tenant } from "@/payload-types"
import { getPlatformMailSender, sendEmail, type MailLogPayload } from "@/lib/email/sendEmail"
import { siteLiveNoticeTemplate } from "@/lib/email/templates/siteLiveNotice"
import { relationshipId } from "@/lib/relationshipId"

type SnapshotDoc = {
  id?: string | number | null
  status?: string | null
  domain?: string | null
  snapshot?: {
    siteUrl?: string | null
    domain?: string | null
    settings?: {
      siteUrl?: string | null
    } | null
  } | null
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const cleanText = (value: unknown): string | null => {
  if (typeof value !== "string") return null
  const cleaned = value.trim()
  return cleaned ? cleaned : null
}

const cleanEmail = (value: unknown): string | null => {
  const email = cleanText(value)?.toLowerCase()
  if (!email || email.includes("\n") || email.includes("\r")) return null
  return emailPattern.test(email) ? email : null
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null

const normalizeHandoffHost = (host: string | null | undefined): string =>
  (host ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "")

function emailFromNormalizedIntake(value: unknown): string | null {
  const normalized = asRecord(value)
  if (!normalized) return null

  const contact = asRecord(normalized.contact)
  return cleanEmail(contact?.email)
    ?? cleanEmail(normalized.contactEmail)
    ?? cleanEmail(asRecord(normalized.finalDetails)?.email)
    ?? cleanEmail(normalized.email)
}

function emailFromRun(run: SiteGenerationRun | null): string | null {
  if (!run) return null

  const direct = emailFromNormalizedIntake(run.normalizedIntake)
  if (direct) return direct

  const generationInput = asRecord(run.generationInput)
  return emailFromNormalizedIntake(generationInput?.normalizedIntake)
}

async function emailFromLinkedIntake(payload: Payload, run: SiteGenerationRun): Promise<string | null> {
  const intakeId = relationshipId(run.intakeSubmission)
  if (!intakeId) return null

  try {
    const intake = await payload.findByID({
      collection: "intake-submissions",
      id: intakeId as any,
      depth: 0,
      overrideAccess: true,
    } as any) as any
    return cleanEmail(intake?.contactEmail) ?? emailFromNormalizedIntake(intake?.normalized)
  } catch (error) {
    ;(payload as any).logger?.warn?.("[publish] live handoff intake lookup failed", {
      tenant: relationshipId(run.tenant),
      generationRun: run.id,
      intakeSubmission: intakeId,
      error: error instanceof Error ? error.message : "unknown",
    })
    return null
  }
}

export async function resolveLiveHandoffRecipient(
  payload: Payload,
  run: SiteGenerationRun | null,
): Promise<string | null> {
  if (!run) return null
  return emailFromRun(run) ?? (await emailFromLinkedIntake(payload, run))
}

export function buildLiveSiteUrl(snapshotDoc: SnapshotDoc): string | null {
  const explicit = cleanText(snapshotDoc.snapshot?.siteUrl) ?? cleanText(snapshotDoc.snapshot?.settings?.siteUrl)
  if (explicit) return explicit

  const domain = normalizeHandoffHost(snapshotDoc.snapshot?.domain ?? snapshotDoc.domain)
  return domain ? `https://${domain}` : null
}

export function buildTenantAdminUrl(tenant: Pick<Tenant, "domain">): string | null {
  const domain = normalizeHandoffHost(tenant.domain)
  return domain ? `https://admin.${domain}` : null
}

export async function sendLiveHandoffEmailAfterActivation(
  payload: Payload,
  input: {
    tenant: Pick<Tenant, "id" | "domain">
    run: SiteGenerationRun | null
    snapshotDoc: SnapshotDoc
    rollback?: boolean
  },
): Promise<"sent" | "skipped" | "failed"> {
  if (!input.run || input.rollback || input.snapshotDoc.status !== "drafted") return "skipped"

  const recipient = await resolveLiveHandoffRecipient(payload, input.run)
  if (!recipient) {
    ;(payload as any).logger?.warn?.("[publish] live handoff email skipped", {
      reason: "missing_recipient",
      tenant: input.tenant.id,
      generationRun: input.run.id,
      snapshot: input.snapshotDoc.id,
    })
    return "skipped"
  }

  const siteUrl = buildLiveSiteUrl(input.snapshotDoc)
  const adminUrl = buildTenantAdminUrl(input.tenant)
  if (!siteUrl || !adminUrl) {
    ;(payload as any).logger?.warn?.("[publish] live handoff email skipped", {
      reason: "missing_urls",
      tenant: input.tenant.id,
      generationRun: input.run.id,
      snapshot: input.snapshotDoc.id,
    })
    return "skipped"
  }

  const message = siteLiveNoticeTemplate({ siteUrl, adminUrl })

  try {
    await sendEmail({
      intent: "site.live_notice",
      to: recipient,
      from: getPlatformMailSender(),
      tenant: input.tenant.id,
      subject: message.subject,
      html: message.html,
      text: message.text,
      payload: payload as MailLogPayload,
    })
    return "sent"
  } catch (error) {
    ;(payload as any).logger?.warn?.("[publish] live handoff email failed after activation", {
      tenant: input.tenant.id,
      generationRun: input.run.id,
      snapshot: input.snapshotDoc.id,
      error: error instanceof Error ? error.message : "unknown",
    })
    return "failed"
  }
}
