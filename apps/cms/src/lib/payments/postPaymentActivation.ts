import "server-only"
import type { Payload } from "payload"
import type { SiteGenerationRun, Tenant } from "@/payload-types"
import { relationshipId } from "@/lib/relationshipId"
import {
  activatePublishedSnapshot,
  canActivatePublishedSnapshot,
  publishSiteSnapshot,
} from "@/lib/publish/siteSnapshots"
import { refreshTenantEmailSendingFromCloudflare } from "@/lib/tenants/emailSendingRefresh"
import {
  recordGenerationRunPostPaymentAutomationState,
  type GenerationRunPostPaymentAutomationState,
} from "@/lib/payments/generationRunPayment"

export type PostPaymentActivationResult =
  | { status: "activated"; snapshotId: string | number | null }
  | { status: "blocked" | "failed"; message: string }

const nowIso = (): string => new Date().toISOString()

const automationState = (
  input: Omit<GenerationRunPostPaymentAutomationState, "at">,
): GenerationRunPostPaymentAutomationState => ({
  ...input,
  at: nowIso(),
})

async function loadTenant(payload: Payload, run: SiteGenerationRun): Promise<Tenant> {
  const tenantId = relationshipId(run.tenant)
  if (!tenantId) throw new Error("Generation run is missing a tenant.")
  return payload.findByID({
    collection: "tenants",
    id: tenantId as any,
    depth: 0,
    overrideAccess: true,
  }) as Promise<Tenant>
}

async function latestRunSnapshot(payload: Payload, run: SiteGenerationRun): Promise<any | null> {
  const result = await payload.find({
    collection: "published-site-snapshots" as any,
    where: { sourceGenerationRun: { equals: run.id } },
    sort: "-publishedAt",
    limit: 10,
    depth: 0,
    overrideAccess: true,
  } as any)
  const docs = result.docs as any[]
  return docs.find((doc) => doc.status === "active" || doc.status === "drafted") ?? null
}

export async function publishAndActivateAfterCompletedPayment(
  payload: Payload,
  run: SiteGenerationRun,
): Promise<PostPaymentActivationResult> {
  let tenant: Tenant
  try {
    tenant = await loadTenant(payload, run)
    tenant = await refreshTenantEmailSendingFromCloudflare(payload, tenant)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Post-payment provisioning status refresh failed."
    await recordGenerationRunPostPaymentAutomationState(payload, run, automationState({
      status: "failed",
      step: "refresh_provisioning",
      message,
    }))
    return { status: "failed", message }
  }

  const gate = canActivatePublishedSnapshot(run, { tenant })
  if (!gate.ok) {
    await recordGenerationRunPostPaymentAutomationState(payload, run, automationState({
      status: "blocked",
      step: "activation_gate",
      message: gate.reason,
    }))
    return { status: "blocked", message: gate.reason }
  }

  try {
    const existingSnapshot = await latestRunSnapshot(payload, run)
    let snapshotId: string | number | null = existingSnapshot?.id ?? null
    if (existingSnapshot?.status === "active") {
      await recordGenerationRunPostPaymentAutomationState(payload, run, automationState({
        status: "activated",
        step: "publish_activate",
        message: "Generation run already has an active published snapshot.",
        snapshotId,
      }))
      return { status: "activated", snapshotId }
    }
    if (existingSnapshot) {
      const activated = await activatePublishedSnapshot(payload, {
        snapshotId: existingSnapshot.id,
        activationReason: "automatic activation after completed payment and provisioning",
      })
      snapshotId = activated?.id ?? existingSnapshot.id
    } else {
      const result = await publishSiteSnapshot(payload, {
        tenantId: tenant.id,
        generationRunId: run.id,
        activate: true,
        activationReason: "automatic activation after completed payment and provisioning",
      })
      snapshotId = result.snapshot?.id ?? null
    }
    await recordGenerationRunPostPaymentAutomationState(payload, run, automationState({
      status: "activated",
      step: "publish_activate",
      message: "Published and activated automatically after completed payment and provisioning.",
      snapshotId,
    }))
    return { status: "activated", snapshotId }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Automatic publish and activation failed."
    await recordGenerationRunPostPaymentAutomationState(payload, run, automationState({
      status: "failed",
      step: "publish_activate",
      message,
    }))
    return { status: "failed", message }
  }
}
