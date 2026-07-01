import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  sendEmail: vi.fn(),
}))

vi.mock("@/lib/email/sendEmail", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/email/sendEmail")>()
  return {
    ...actual,
    getPlatformMailSender: () => "noreply@siteinabox.nl",
    sendEmail: mocks.sendEmail,
  }
})

import { activatePublishedSnapshot } from "@/lib/publish/siteSnapshots"
import { sendLiveHandoffEmailAfterActivation } from "@/lib/publish/liveHandoffEmail"

const approvedPaidRun = {
  id: 500,
  intakeSubmission: 700,
  tenant: 1,
  normalizedIntake: {
    contact: {
      email: "Customer@Example.com",
    },
  },
  clientApproval: { status: "approved" },
  payment: { status: "completed" },
} as any

const verifiedTenant = {
  id: 1,
  domain: "clientsite.nl",
  status: "provisioning",
  domainVerification: { status: "verified" },
  emailSending: {
    provider: "cloudflare",
    mode: "subdomain",
    status: "verified",
    sendingDomain: "mail.clientsite.nl",
    senderEmail: "noreply@mail.clientsite.nl",
  },
} as any

const draftedSnapshot = {
  id: 10,
  tenant: verifiedTenant.id,
  domain: verifiedTenant.domain,
  sourceGenerationRun: approvedPaidRun.id,
  status: "drafted",
  snapshot: {
    siteUrl: "https://clientsite.nl",
  },
} as any

const createActivationPayload = (input?: {
  tenant?: any
  run?: any
  snapshot?: any
  intake?: any
}) => {
  const tenant = { ...(input?.tenant ?? verifiedTenant) }
  const run = input?.run ?? approvedPaidRun
  const snapshot = { ...(input?.snapshot ?? draftedSnapshot) }
  const intake = input?.intake ?? {
    id: 700,
    contactEmail: "intake@example.com",
    normalized: { contact: { email: "normalized-intake@example.com" } },
  }
  const updates: any[] = []
  const payload = {
    findByID: vi.fn(async ({ collection, id }: any) => {
      if (collection === "published-site-snapshots" && String(id) === String(snapshot.id)) return snapshot
      if (collection === "tenants" && String(id) === String(tenant.id)) return tenant
      if (collection === "site-generation-runs" && String(id) === String(run.id)) return run
      if (collection === "intake-submissions" && String(id) === String(intake.id)) return intake
      throw new Error(`Missing ${collection} ${id}`)
    }),
    find: vi.fn(async () => ({ docs: [] })),
    update: vi.fn(async ({ collection, data }: any) => {
      updates.push({ collection, data })
      if (collection === "tenants") {
        Object.assign(tenant, data)
        return tenant
      }
      if (collection === "published-site-snapshots") {
        Object.assign(snapshot, data)
        return snapshot
      }
      return { ...data }
    }),
    logger: { warn: vi.fn(), error: vi.fn() },
  }
  return { payload: payload as any, tenant, run, snapshot, updates }
}

describe("CMS live handoff email", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.sendEmail.mockResolvedValue({ provider: "test" })
  })

  it("sends a site.live_notice email after generated-site activation", async () => {
    const { payload } = createActivationPayload()

    await expect(activatePublishedSnapshot(payload, {
      snapshotId: 10,
      manualActivation: true,
      activatedBy: 1,
      activationReason: "manual activation",
    })).resolves.toMatchObject({ id: 10, status: "active" })

    expect(mocks.sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      intent: "site.live_notice",
      to: "customer@example.com",
      from: "noreply@siteinabox.nl",
      tenant: 1,
      subject: "Your Site in a Box site is live",
      payload,
    }))
    expect(mocks.sendEmail.mock.calls[0]?.[0].html).toContain("https://clientsite.nl")
    expect(mocks.sendEmail.mock.calls[0]?.[0].html).toContain("https://admin.clientsite.nl")
  })

  it("skips live handoff when a generated run has no customer recipient", async () => {
    const { payload, tenant, snapshot } = createActivationPayload({
      run: {
        ...approvedPaidRun,
        normalizedIntake: { contact: {} },
        generationInput: { normalizedIntake: { contact: {} } },
      },
      intake: { id: 700, contactEmail: null, normalized: { contact: {} } },
    })

    await expect(sendLiveHandoffEmailAfterActivation(payload, {
      tenant,
      run: await payload.findByID({ collection: "site-generation-runs", id: 500 }),
      snapshotDoc: snapshot,
    })).resolves.toBe("skipped")

    expect(mocks.sendEmail).not.toHaveBeenCalled()
    expect(payload.logger.warn).toHaveBeenCalledWith("[publish] live handoff email skipped", expect.objectContaining({
      reason: "missing_recipient",
      tenant: 1,
      generationRun: 500,
      snapshot: 10,
    }))
  })

  it("keeps activation non-blocking when live handoff delivery fails", async () => {
    const { payload, tenant, snapshot } = createActivationPayload()
    mocks.sendEmail.mockRejectedValue(new Error("provider down"))

    await expect(activatePublishedSnapshot(payload, { snapshotId: 10 })).resolves.toMatchObject({
      id: 10,
      status: "active",
    })

    expect(tenant.status).toBe("active")
    expect(snapshot.status).toBe("active")
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1)
    expect(payload.logger.warn).toHaveBeenCalledWith("[publish] live handoff email failed after activation", expect.objectContaining({
      tenant: 1,
      generationRun: 500,
      snapshot: 10,
      error: "provider down",
    }))
  })

  it("does not send normal live handoff for rollback, current-state activation, or reactivation", async () => {
    const rollback = createActivationPayload()
    await expect(activatePublishedSnapshot(rollback.payload, {
      snapshotId: 10,
      rollback: true,
      manualActivation: true,
      activationReason: "manual rollback",
    })).resolves.toMatchObject({ status: "active" })

    const currentState = createActivationPayload({
      run: null,
      snapshot: {
        ...draftedSnapshot,
        sourceGenerationRun: null,
      },
    })
    await expect(activatePublishedSnapshot(currentState.payload, {
      snapshotId: 10,
      manualActivation: true,
    })).resolves.toMatchObject({ status: "active" })

    const reactivation = createActivationPayload({
      snapshot: {
        ...draftedSnapshot,
        status: "superseded",
      },
    })
    await expect(activatePublishedSnapshot(reactivation.payload, {
      snapshotId: 10,
      manualActivation: true,
    })).resolves.toMatchObject({ status: "active" })

    expect(mocks.sendEmail).not.toHaveBeenCalled()
  })
})
