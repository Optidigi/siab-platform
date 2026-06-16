// Create / refresh a known-credentials super-admin for the local test
// harness. Idempotent — if the email exists, password is reset to the
// declared value.
import "dotenv/config"
import { getPayload } from "payload"
import config from "@/payload.config"

const EMAIL = "admin@local.test"
const PASSWORD = "LocalTest!1234"

const main = async () => {
  const payload = await getPayload({ config })
  const existing = await payload.find({
    collection: "users", where: { email: { equals: EMAIL } }, limit: 1, overrideAccess: true,
  })
  if (existing.docs[0]) {
    const user = existing.docs[0] as any
    await payload.update({
      collection: "users", id: user.id,
      data: { password: PASSWORD } as any, overrideAccess: true, user,
    })
    console.log(`[seed] reset password for super-admin ${EMAIL}`)
  } else {
    await payload.create({
      collection: "users",
      data: { email: EMAIL, password: PASSWORD, role: "super-admin", name: "Local Admin" } as any,
      overrideAccess: true,
    })
    console.log(`[seed] created super-admin ${EMAIL}`)
  }
  console.log("")
  console.log("===========================================")
  console.log(`Login: http://localhost:3000/login`)
  console.log(`Email:    ${EMAIL}`)
  console.log(`Password: ${PASSWORD}`)
  console.log("===========================================")
  process.exit(0)
}

main().catch((e) => { console.error(e); process.exit(1) })
