#!/usr/bin/env node
/**
 * Clear amicare's Tenant.theme so canvas + site both fall back to the
 * tenant's source-of-truth global.css palette (the real production
 * colors). Earlier ThemeBar test clicks wrote a divergent `palette`
 * into Tenant.theme that was then injected as <style data-tenant-theme>
 * on the live site (and also the canvas via toCssVars), overriding
 * amicare's #A04E32 with the wrong #c97c2e.
 */
import "dotenv/config"
import { getPayload } from "payload"
import config from "../src/payload.config.ts"

const main = async () => {
  const payload = await getPayload({ config })
  const before = await payload.findByID({ collection: "tenants", id: 1, overrideAccess: true })
  console.log("before:", JSON.stringify(before.theme, null, 2))
  await payload.update({
    collection: "tenants",
    id: 1,
    data: { theme: null },
    overrideAccess: true,
  })
  const after = await payload.findByID({ collection: "tenants", id: 1, overrideAccess: true })
  console.log("after:", JSON.stringify(after.theme, null, 2))
  process.exit(0)
}

main().catch((e) => { console.error(e); process.exit(1) })
