import type { Locale } from "@/i18n/config"

const loaders = {
  en: () => import("@/locales/en.json").then((mod) => mod.default),
  nl: () => import("@/locales/nl.json").then((mod) => mod.default),
} satisfies Record<Locale, () => Promise<IntlMessages>>

export async function loadMessages(locale: Locale): Promise<IntlMessages> {
  return loaders[locale]()
}
