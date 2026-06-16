"use server"
import { headers } from "next/headers"
import { getPayload } from "payload"
import config from "@/payload.config"

/** Persist the caller's preferred editor mode. Caller is resolved from cookies
 *  via Payload's auth strategy — no token-passing from the client. */
export const setUserEditorMode = async (mode: "canvas" | "sidebar"): Promise<void> => {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (!user) throw new Error("Forbidden: authentication required")
  await payload.update({
    collection: "users",
    id: user.id as any,
    data: { editorMode: mode } as any,
    overrideAccess: false,
    user,
  })
}
