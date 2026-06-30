import { cookies, headers } from "next/headers"
import { getRequestConfig } from "next-intl/server"
import { defaultLocale, localeCookieName, resolveLocale } from "@/i18n/config"
import { loadMessages } from "@/i18n/messages"

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  await headers()
  const locale = resolveLocale(
    cookieStore.get(localeCookieName)?.value,
    defaultLocale,
  )

  return {
    locale,
    messages: await loadMessages(locale),
  }
})
