import { NextResponse } from "next/server"
import { getPayload } from "payload"
import config from "@/payload.config"
import { emailUserDataExport } from "@/lib/privacy/userDataExport"

export async function POST(req: Request) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: req.headers })
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    await emailUserDataExport(payload, user)
    return NextResponse.json({ ok: true })
  } catch (err) {
    payload.logger.error({ err, userId: user.id }, "[privacy] data export request failed")
    return NextResponse.json({ message: "Could not send data export" }, { status: 500 })
  }
}
