import type { APIRequestContext } from "@playwright/test"
import { cleanupTenant, readE2ESeed } from "./_seed"

export async function ensureE2EUser(ctx?: APIRequestContext) {
  void ctx
  const seed = readE2ESeed()
  return seed.superAdmin
}

export async function cleanupE2ETenant(slug: string, ctx?: APIRequestContext) {
  void ctx
  await cleanupTenant(slug)
}
