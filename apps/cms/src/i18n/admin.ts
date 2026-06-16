import { getTranslations } from "next-intl/server"
import { resolveLocale } from "@/i18n/config"

type AdminUser = {
  language?: string | null
}

export function getAdminLocale(user: AdminUser) {
  return resolveLocale(user.language)
}

export function getAdminTranslations(user: AdminUser, namespace: string) {
  return getTranslations({ locale: getAdminLocale(user), namespace })
}
