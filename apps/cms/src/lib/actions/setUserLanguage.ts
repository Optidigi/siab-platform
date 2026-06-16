"use server"

import { cookies, headers } from "next/headers"
import { getPayload } from "payload"
import config from "@/payload.config"
import { isLocale, localeCookieName, type Locale } from "@/i18n/config"

export async function setUserLanguage(language: Locale) {
  if (!isLocale(language)) {
    throw new Error("Unsupported language")
  }

  const payload = await getPayload({ config })
  const headerStore = await headers()
  const result = await payload.auth({ headers: headerStore })
  const user = result.user
  if (!user) throw new Error("Authentication required")

  await payload.update({
    collection: "users",
    id: user.id,
    data: { language },
    user,
  })

  const cookieStore = await cookies()
  cookieStore.set(localeCookieName, language, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
  })
}
