import type { AnalyticsBlockMetadata, SiteChromeVariant } from "@siteinabox/contracts"
import { resolveBlockVariant } from "./variants"

type NativeResolvedBlock = {
  blockType: string
  variant?: string | null
  analytics?: AnalyticsBlockMetadata | null
}

type NativeBlockClassSlot =
  | "section"
  | "eyebrow"
  | "title"
  | "intro"
  | "description"
  | "body"
  | "actions"
  | "cta"
  | "ctaPrimary"
  | "ctaSecondary"
  | "image"
  | "list"
  | "item"
  | "icon"
  | "form"
  | "formField"
  | "label"
  | "input"
  | "textarea"
  | "submit"
  | "header"
  | "grid"
  | "card"
  | "meta"
  | "avatar"
  | "marker"
  | "table"
  | "scroll"

type NativeChromeClassSlot =
  | "root"
  | "inner"
  | "brand"
  | "nav"
  | "link"
  | "cta"
  | "toggle"
  | "content"
  | "columns"
  | "column"
  | "item"
  | "bottom"
  | "dismiss"

type NativeBlockClassMap = Partial<Record<NativeBlockClassSlot, string>>
type NativeChromeClassMap = Partial<Record<NativeChromeClassSlot, string>>

const nativeBlockVariantClasses: Record<string, NativeBlockClassMap> = {
  tailwindPlusSimpleCentered: {
    section: "!w-full !max-w-none !px-6 !py-24 !text-center sm:!py-32 lg:!px-8",
    eyebrow:
      "!mx-auto !w-fit !rounded-full !px-3 !py-1 !text-sm/6 !font-medium !text-[var(--color-ink-muted)] !ring-1 !ring-[var(--color-rule)]",
    title:
      "!mx-auto !max-w-2xl !text-5xl !font-semibold !tracking-normal !text-balance !text-[var(--color-ink)] sm:!text-7xl",
    intro: "!mx-auto !mt-8 !max-w-xl !text-lg/8 !text-pretty !text-[var(--color-ink-muted)]",
    actions: "!mt-10 !flex !items-center !justify-center !gap-x-6",
    cta: "!rounded-md !px-3.5 !py-2.5 !text-sm !font-semibold !shadow-xs",
    image: "!mx-auto !mt-12 !max-w-5xl !overflow-hidden !rounded-xl !shadow-2xl !ring-1 !ring-gray-900/10",
  },
  tailwindPlusCentered2x2: {
    section: "!w-full !max-w-none !px-6 !py-24 sm:!py-32 lg:!px-8",
    title:
      "!mx-auto !max-w-2xl !text-center !text-3xl !font-semibold !tracking-normal !text-balance !text-[var(--color-ink)] sm:!text-4xl",
    intro: "!mx-auto !mt-6 !max-w-2xl !text-center !text-lg/8 !text-[var(--color-ink-muted)]",
    list: "!mx-auto !mt-16 !grid !max-w-5xl !grid-cols-1 !gap-x-8 !gap-y-10 sm:!grid-cols-2",
    item: "!border-0 !bg-transparent !p-0 !shadow-none",
    icon: "!mb-6 !flex !size-10 !items-center !justify-center !rounded-lg !bg-[var(--color-accent)] !text-white",
  },
  tailblocksContentA: {
    section: "!w-full !max-w-none !px-5 !py-24 !text-gray-600",
    body: "!mx-auto !max-w-3xl !text-center !text-base/7 !leading-relaxed",
  },
  tailblocksCtaA: {
    section: "!w-full !max-w-none !bg-white !px-5 !py-24 !text-gray-900",
    title: "!text-2xl !font-medium !tracking-normal sm:!text-3xl",
    description: "!mt-4 !text-base/7 !text-gray-500",
    actions: "!mt-8 !flex !flex-col !gap-3 sm:!flex-row",
    ctaPrimary: "!rounded !border-0 !bg-[var(--color-accent)] !px-8 !py-2 !text-lg !text-white hover:!brightness-95",
    ctaSecondary: "!rounded !border !border-gray-300 !bg-white !px-8 !py-2 !text-lg !text-gray-700 hover:!bg-gray-100",
  },
  tailwindPlusNewsletterDetails: {
    section: "!w-full !max-w-none !bg-gray-900 !px-6 !py-16 !text-white sm:!py-24 lg:!px-8",
    title: "!max-w-xl !text-3xl !font-semibold !tracking-normal !text-white sm:!text-4xl",
    description: "!mt-4 !max-w-xl !text-lg/8 !text-gray-300",
    form: "!mt-10 !grid !max-w-md !grid-cols-1 !gap-y-4",
    formField: "!grid !gap-2",
    label: "!text-sm/6 !font-semibold !text-white",
    input:
      "!block !w-full !rounded-md !bg-white/5 !px-3.5 !py-2.5 !text-white !outline-1 !outline-white/10 placeholder:!text-gray-500 focus:!outline-2 focus:!-outline-offset-2 focus:!outline-[var(--color-accent)]",
    textarea: "!min-h-28",
    submit: "!rounded-md !border-0 !bg-[var(--color-accent)] !px-3.5 !py-2.5 !text-sm !font-semibold !text-white !shadow-xs",
  },
  hyperUiNewsletterCentered: {
    section: "!w-full !max-w-none !px-4 !py-16 sm:!px-6 lg:!px-8",
    title: "!mx-auto !max-w-xl !text-center !text-3xl !font-bold !tracking-normal !text-gray-900 sm:!text-4xl",
    description: "!mx-auto !mt-4 !max-w-xl !text-center !text-gray-500",
    form: "!mx-auto !mt-8 !flex !max-w-md !flex-col !gap-4 sm:!flex-row",
    formField: "!w-full",
    label: "!sr-only",
    input: "!w-full !rounded-md !border-gray-200 !bg-white !p-3 !text-sm !shadow-sm",
    submit: "!rounded-md !border-0 !bg-[var(--color-accent)] !px-5 !py-3 !text-sm !font-medium !text-white",
  },
  prelineCenteredNewsletter: {
    section: "!w-full !max-w-none !px-4 !py-10 sm:!px-6 lg:!px-8 lg:!py-16",
    title: "!mx-auto !max-w-xl !text-center !text-2xl !font-bold !tracking-normal !text-foreground md:!text-3xl md:!leading-tight",
    description: "!mx-auto !mt-4 !max-w-xl !text-center !text-muted-foreground-1",
    form: "!mx-auto !mt-5 !flex !max-w-xl !flex-col !items-center !gap-2 sm:!flex-row sm:!gap-3 lg:!mt-8",
    formField: "!w-full",
    label: "!sr-only",
    input:
      "!block !w-full !rounded-lg !border-layer-line !bg-layer !px-4 !py-2.5 !text-foreground placeholder:!text-muted-foreground-1 focus:!border-primary-focus focus:!ring-primary-focus sm:!py-3 sm:!text-sm",
    submit:
      "!inline-flex !w-full !items-center !justify-center !gap-x-2 !whitespace-nowrap !rounded-lg !border !border-primary-line !bg-primary !px-4 !py-3 !text-sm !font-medium !text-primary-foreground hover:!bg-primary-hover focus:!bg-primary-focus sm:!w-auto",
  },
  mambaFaq1: {
    section: "!w-full !max-w-none !px-4 !py-16 md:!py-24",
    title: "!mx-auto !max-w-3xl !text-center !text-4xl !font-bold !tracking-normal",
    list: "!mx-auto !mt-8 !max-w-3xl !divide-y !divide-[var(--color-rule)]",
    item: "!rounded-none !border-0 !bg-transparent !px-0 !py-5",
  },
  mambaTestimonial1: {
    section: "!w-full !max-w-none !px-4 !py-16 md:!py-24",
    title: "!mx-auto !max-w-3xl !text-center !text-4xl !font-bold !tracking-normal",
    list: "!mx-auto !mt-12 !grid !max-w-5xl !grid-cols-1 !gap-6 md:!grid-cols-2",
    item: "!rounded-lg !border !border-[var(--color-rule)] !bg-[var(--color-card)] !p-8 !shadow-sm",
    avatar: "!size-12 !rounded-full !object-cover",
  },
  tailwindPlusSimpleTiers: {
    section: "!w-full !max-w-none !px-6 !py-24 sm:!py-32 lg:!px-8",
    header: "!mx-auto !max-w-4xl !text-center",
    title: "!text-4xl !font-semibold !tracking-normal !text-balance !text-[var(--color-ink)] sm:!text-5xl",
    intro: "!mx-auto !mt-6 !max-w-2xl !text-lg/8 !text-pretty !text-[var(--color-ink-muted)]",
    grid: "!mx-auto !mt-16 !grid !max-w-lg !grid-cols-1 !gap-y-6 sm:!mt-20 lg:!max-w-4xl lg:!grid-cols-2 lg:!gap-x-8",
    card: "!rounded-3xl !p-8 !ring-1 !ring-gray-200 xl:!p-10 data-[highlighted=true]:!bg-gray-900 data-[highlighted=true]:!text-white",
    cta: "!mt-8 !block !rounded-md !px-3 !py-2 !text-center !text-sm !font-semibold !ring-1 !ring-inset !ring-[var(--color-accent)]",
  },
  "stats:tailwindPlusSimple": {
    section: "!w-full !max-w-none !px-6 !py-24 sm:!py-32 lg:!px-8",
    header: "!mx-auto !max-w-2xl lg:!mx-0",
    title: "!text-4xl !font-semibold !tracking-normal !text-pretty !text-[var(--color-ink)] sm:!text-5xl",
    intro: "!mt-6 !text-lg/8 !text-[var(--color-ink-muted)]",
    list: "!mx-auto !mt-16 !grid !max-w-2xl !grid-cols-1 !gap-x-8 !gap-y-10 sm:!grid-cols-2 lg:!mx-0 lg:!max-w-none lg:!grid-cols-4",
    item: "!flex !flex-col-reverse !gap-y-3 !border-0 !bg-transparent !p-0",
  },
  "gallery:prelineSquareGrid": {
    section: "!w-full !max-w-none !px-4 !py-10 xl:!mt-10 xl:!py-0",
    header: "!mx-auto !mb-8 !max-w-2xl !text-center",
    title: "!text-2xl !font-bold !tracking-normal !text-foreground md:!text-3xl",
    intro: "!mt-3 !text-muted-foreground-1",
    grid: "!mx-auto !grid !max-w-2xl !grid-cols-2 !gap-2 sm:!grid-cols-4",
    card: "!overflow-hidden !rounded-none",
    image: "!h-40 !w-full !object-cover",
  },
  tailwindPlusGrid: {
    section: "!w-full !max-w-none !px-6 !py-24 sm:!py-32 lg:!px-8",
    header: "!mx-auto !max-w-2xl lg:!mx-0",
    title: "!text-4xl !font-semibold !tracking-normal !text-pretty !text-[var(--color-ink)] sm:!text-5xl",
    intro: "!mt-6 !text-lg/8 !text-[var(--color-ink-muted)]",
    list: "!mx-auto !mt-20 !grid !max-w-2xl !grid-cols-1 !gap-x-8 !gap-y-16 sm:!grid-cols-2 lg:!mx-0 lg:!max-w-none lg:!grid-cols-3",
    item: "!border-0 !bg-transparent !p-0",
    image: "!aspect-3/2 !w-full !rounded-2xl !object-cover",
  },
  tailwindPlusThreeColumn: {
    section: "!w-full !max-w-none !px-6 !py-24 sm:!py-32 lg:!px-8",
    header: "!mx-auto !max-w-2xl !text-center",
    title: "!text-4xl !font-semibold !tracking-normal !text-balance !text-[var(--color-ink)] sm:!text-5xl",
    intro: "!mt-2 !text-lg/8 !text-[var(--color-ink-muted)]",
    grid: "!mx-auto !mt-16 !grid !max-w-2xl !grid-cols-1 !gap-x-8 !gap-y-20 lg:!mx-0 lg:!max-w-none lg:!grid-cols-3",
    card: "!flex !flex-col !items-start !justify-between !border-0 !bg-transparent !p-0",
    image: "!aspect-video !w-full !rounded-2xl !object-cover",
    meta: "!mt-8 !flex !items-center !gap-x-4 !text-xs !text-[var(--color-ink-muted)]",
  },
  mambaSteps: {
    section: "!w-full !max-w-none !px-4 !py-16 md:!py-24",
    header: "!mx-auto !max-w-3xl !text-center",
    title: "!text-4xl !font-bold !tracking-normal",
    intro: "!mt-4 !text-[var(--color-ink-muted)]",
    list: "!mx-auto !mt-12 !grid !max-w-5xl !grid-cols-1 !gap-8 md:!grid-cols-3",
    item: "!relative !border-0 !bg-transparent !p-0 !text-center",
    marker: "!mx-auto !mb-4 !flex !size-12 !items-center !justify-center !rounded-full !bg-[var(--color-accent)] !text-white",
  },
  "logoCloud:tailwindPlusSimple": {
    section: "!w-full !max-w-none !px-6 !py-24 sm:!py-32 lg:!px-8",
    title: "!text-center !text-lg/8 !font-semibold !text-[var(--color-ink)]",
    intro: "!mx-auto !mt-4 !max-w-2xl !text-center !text-[var(--color-ink-muted)]",
    list: "!mx-auto !mt-10 !grid !max-w-lg !grid-cols-2 !items-center !gap-x-8 !gap-y-10 sm:!max-w-xl sm:!grid-cols-3 lg:!mx-0 lg:!max-w-none lg:!grid-cols-5",
    item: "!col-span-1 !flex !justify-center !border-0 !bg-transparent !p-0",
  },
}

const nativeChromeVariantClasses: Record<string, NativeChromeClassMap> = {
  "header:hyperUiSimple": {
    root: "!mx-auto !flex !min-h-16 !max-w-7xl !items-center !justify-between !gap-4 !px-4 sm:!px-6 lg:!px-8",
    brand: "!inline-flex !items-center !gap-2 !text-sm !font-semibold !text-gray-900",
    nav: "!hidden !items-center !gap-8 md:!flex",
    link: "!text-sm !font-medium !text-gray-600 hover:!text-gray-900 aria-[current=page]:!text-[var(--color-accent)]",
    cta: "!hidden !rounded-md !bg-[var(--color-accent)] !px-4 !py-2 !text-sm !font-medium !text-white md:!inline-flex",
    toggle: "md:!hidden",
  },
  "footer:hyperUiSimple": {
    root: "!w-full !border-t !border-gray-100 !bg-white !px-4 !py-12 sm:!px-6 lg:!px-8",
    inner: "!mx-auto !grid !max-w-7xl !grid-cols-1 !gap-8 lg:!grid-cols-3",
    brand: "!max-w-sm",
    columns: "!grid !grid-cols-2 !gap-8 sm:!grid-cols-3 lg:!col-span-2",
    item: "!space-y-3",
    link: "!text-sm !text-gray-700 hover:!text-gray-900",
    bottom: "!mx-auto !mt-12 !flex !max-w-7xl !flex-col !gap-4 !border-t !border-gray-100 !pt-6 sm:!flex-row sm:!items-center sm:!justify-between",
  },
  "banner:hyperUiSimple": {
    root: "!w-full !bg-[var(--color-accent)] !px-4 !py-3 !text-white sm:!px-6 lg:!px-8",
    content: "!mx-auto !flex !max-w-7xl !items-center !justify-center !gap-3 !text-center !text-sm !font-medium",
    link: "!underline !underline-offset-4",
    dismiss: "!absolute !right-4 !top-1/2 !-translate-y-1/2 !text-white/80 hover:!text-white",
  },
}

export function cx(...values: Array<string | false | null | undefined>) {
  return values.filter((value): value is string => Boolean(value)).join(" ")
}

export function nativeBlockClassName(block: NativeResolvedBlock, slot: NativeBlockClassSlot) {
  const variant = resolveBlockVariant(block).variant
  if (!variant) return ""
  const blockVariantKey = `${block.blockType}:${variant}`
  return (
    nativeBlockVariantClasses[blockVariantKey]?.[slot] ??
    nativeBlockVariantClasses[variant]?.[slot] ??
    ""
  )
}

export function nativeChromeClassName(
  area: "header" | "footer" | "banner",
  variant: SiteChromeVariant | null | undefined,
  slot: NativeChromeClassSlot,
) {
  const key = `${area}:${variant ?? "default"}`
  return nativeChromeVariantClasses[key]?.[slot] ?? ""
}
