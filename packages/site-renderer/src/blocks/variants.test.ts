import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import type { Page } from "@siteinabox/contracts"
import { ComparisonBlockRenderer } from "./Comparison"
import { FAQBlockRenderer } from "./FAQ"
import { HeroBlockRenderer } from "./Hero"
import { PricingBlockRenderer } from "./Pricing"
import {
  SITE_CHROME_CATALOG,
  SITE_GENERATION_BLOCK_CATALOG_BY_SLUG,
  SITE_SOURCE_BACKED_BLOCK_VARIANTS,
  SITE_SOURCE_BACKED_CHROME_VARIANTS,
} from "@siteinabox/contracts/block-catalog"
import {
  amblastPublishedSiteSnapshot,
  amblastSiteGenerationSpec,
  amicarePublishedSiteSnapshot,
  amicareSiteGenerationSpec,
} from "@siteinabox/contracts/fixtures/tenants"
import { GeneratedSiteSettingsSchema } from "@siteinabox/contracts/generation"
import { SiteBanner, SiteFooter, SiteHeader } from "../chrome"
import { v1FixturePage, v1FixtureSettings } from "../fixtures/v1"
import { resolveLegacyTenant } from "../legacy-tenants/resolve"
import { SitePageRenderer } from "../SitePageRenderer"
import { rendererVariantClassName, resolveBlockVariant, runtimeVariantDataAttribute } from "./variants"

function assertEqual<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${String(expected)}, received ${String(actual)}`)
  }
}

function assertIncludes(value: string, expected: string, label: string) {
  if (!value.includes(expected)) {
    throw new Error(`${label}: expected output to include ${expected}`)
  }
}

function assertExcludes(value: string, unexpected: string, label: string) {
  if (value.includes(unexpected)) {
    throw new Error(`${label}: expected output not to include ${unexpected}`)
  }
}

const inlineText = (text: string) => ({
  t: "root" as const,
  variant: "inline" as const,
  children: [{ t: "text" as const, v: text }],
})

const blockText = (text: string) => ({
  t: "root" as const,
  variant: "block" as const,
  children: [{ t: "paragraph" as const, children: [{ t: "text" as const, v: text }] }],
})

function runVariantResolverTests() {
  const supportedVariants: Array<{
    blockType: string
    variant: string
    rendererClassName: string
  }> = [
    { blockType: "hero", variant: "tailwindPlusSimpleCentered", rendererClassName: "cms-block--source-tailwind-plus-simple-centered" },
    { blockType: "hero", variant: "minimal", rendererClassName: "" },
    { blockType: "hero", variant: "amicareZenHero", rendererClassName: "cms-block--source-amicare-zen-hero" },
    { blockType: "featureList", variant: "tailwindPlusCentered2x2", rendererClassName: "cms-block--source-tailwind-plus-centered-2x2" },
    { blockType: "featureList", variant: "services", rendererClassName: "" },
    { blockType: "featureList", variant: "amicareCareCards", rendererClassName: "cms-block--source-amicare-care-cards" },
    { blockType: "richText", variant: "tailblocksContentA", rendererClassName: "cms-block--source-tailblocks-content-a" },
    { blockType: "richText", variant: "prose", rendererClassName: "" },
    { blockType: "richText", variant: "amicareEditorial", rendererClassName: "cms-block--source-amicare-editorial" },
    { blockType: "cta", variant: "tailblocksCtaA", rendererClassName: "cms-block--source-tailblocks-cta-a" },
    { blockType: "cta", variant: "quote", rendererClassName: "" },
    { blockType: "cta", variant: "amicareQuoteContact", rendererClassName: "cms-block--source-amicare-quote-contact" },
    { blockType: "contactSection", variant: "tailwindPlusNewsletterDetails", rendererClassName: "cms-block--source-tailwind-plus-newsletter-details" },
    { blockType: "contactSection", variant: "hyperUiNewsletterCentered", rendererClassName: "cms-block--source-hyperui-newsletter-centered" },
    { blockType: "contactSection", variant: "prelineCenteredNewsletter", rendererClassName: "cms-block--source-preline-centered-newsletter" },
    { blockType: "contactSection", variant: "form", rendererClassName: "" },
    { blockType: "contactSection", variant: "amicareContactForm", rendererClassName: "cms-block--source-amicare-contact-form" },
    { blockType: "faq", variant: "mambaFaq1", rendererClassName: "cms-block--source-mamba-faq-1" },
    { blockType: "faq", variant: "accordion", rendererClassName: "" },
    { blockType: "faq", variant: "amicareWarmAccordion", rendererClassName: "cms-block--source-amicare-warm-accordion" },
    { blockType: "testimonials", variant: "mambaTestimonial1", rendererClassName: "cms-block--source-mamba-testimonial-1" },
    { blockType: "testimonials", variant: "cards", rendererClassName: "" },
    { blockType: "testimonials", variant: "amicareStoryCards", rendererClassName: "cms-block--source-amicare-story-cards" },
    { blockType: "mediaHero", variant: "amblastShapedHero", rendererClassName: "cms-block--source-amblast-shaped-overlay" },
    { blockType: "infoCardList", variant: "amblastImageBoxes", rendererClassName: "cms-block--source-amblast-image-boxes" },
    { blockType: "serviceCarousel", variant: "amblastSwiperServices", rendererClassName: "cms-block--source-amblast-swiper-services" },
    { blockType: "beforeAfterGallery", variant: "amblastPortfolio", rendererClassName: "cms-block--source-amblast-portfolio-comparisons" },
    { blockType: "contactDetails", variant: "amblastContactCards", rendererClassName: "cms-block--source-amblast-contact-cards" },
    { blockType: "pricing", variant: "tailwindPlusSimpleTiers", rendererClassName: "cms-block--source-tailwind-plus-simple-pricing" },
    { blockType: "stats", variant: "tailwindPlusSimple", rendererClassName: "cms-block--source-tailwind-plus-stats-simple" },
    { blockType: "logoCloud", variant: "tailwindPlusSimple", rendererClassName: "cms-block--source-tailwind-plus-logo-cloud-simple" },
    { blockType: "gallery", variant: "prelineSquareGrid", rendererClassName: "cms-block--source-preline-gallery-square-grid" },
    { blockType: "team", variant: "tailwindPlusGrid", rendererClassName: "cms-block--source-tailwind-plus-team-grid" },
    { blockType: "blogCards", variant: "tailwindPlusThreeColumn", rendererClassName: "cms-block--source-tailwind-plus-blog-three-column" },
    { blockType: "processSteps", variant: "mambaSteps", rendererClassName: "cms-block--source-mamba-process-steps" },
    { blockType: "comparison", variant: "matrix", rendererClassName: "" },
  ]

  for (const supportedVariant of supportedVariants) {
    assertEqual(
      resolveBlockVariant(supportedVariant).variant,
      supportedVariant.variant,
      `${supportedVariant.blockType}:${supportedVariant.variant} resolves`,
    )
    assertEqual(
      rendererVariantClassName(supportedVariant),
      supportedVariant.rendererClassName,
      `${supportedVariant.blockType}:${supportedVariant.variant} renderer class`,
    )
    assertEqual(
      runtimeVariantDataAttribute(supportedVariant),
      supportedVariant.variant,
      `${supportedVariant.blockType}:${supportedVariant.variant} data attribute`,
    )
  }

  const shortVariantHero = {
    blockType: "hero",
    variant: "tailwindPlusSimpleCentered",
    analytics: { sectionVariant: "legacy-value-that-must-not-drive-rendering" },
  }

  assertEqual(resolveBlockVariant(shortVariantHero).variant, "tailwindPlusSimpleCentered", "short variant wins")
  assertEqual(
    rendererVariantClassName(shortVariantHero),
    "cms-block--source-tailwind-plus-simple-centered",
    "short variant maps to renderer class",
  )
  assertEqual(runtimeVariantDataAttribute(shortVariantHero), "tailwindPlusSimpleCentered", "data attribute uses short variant")

  const legacyFaq = {
    blockType: "faq",
    analytics: { sectionVariant: "mamba-faq-1" },
  }

  assertEqual(resolveBlockVariant(legacyFaq).variant, "mambaFaq1", "legacy analytics maps to short variant")
  assertEqual(rendererVariantClassName(legacyFaq), "cms-block--source-mamba-faq-1", "legacy analytics maps to renderer class")
  assertEqual(runtimeVariantDataAttribute(legacyFaq), "mambaFaq1", "legacy data attribute uses mapped short variant")

  const unsupportedVariant = {
    blockType: "hero",
    variant: "notApproved",
    analytics: { sectionVariant: "also-not-approved" },
  }

  assertEqual(resolveBlockVariant(unsupportedVariant).variant, undefined, "unsupported short variant is ignored")
  assertEqual(rendererVariantClassName(unsupportedVariant), "", "unsupported short variant has no renderer class")
  assertEqual(runtimeVariantDataAttribute(unsupportedVariant), undefined, "unsupported short variant has no data attribute")
}

function runBlockRenderTests() {
  const heroMarkup = renderToStaticMarkup(
    React.createElement(HeroBlockRenderer, {
      block: {
        blockType: "hero",
        variant: "tailwindPlusSimpleCentered",
        analytics: { sectionVariant: "legacy-value-that-must-not-drive-rendering" },
        headline: inlineText("Catalog-backed hero"),
      },
      options: { index: 0 },
    }),
  )

  assertIncludes(heroMarkup, "cms-block--source-tailwind-plus-simple-centered", "hero short variant class")
  assertIncludes(heroMarkup, "!max-w-2xl", "hero native Tailwind Plus layout class")
  assertIncludes(heroMarkup, "!text-5xl", "hero native Tailwind Plus typography class")
  assertIncludes(heroMarkup, 'data-source-variant="tailwindPlusSimpleCentered"', "hero data source variant")
  assertIncludes(
    heroMarkup,
    'data-siab-section-variant="legacy-value-that-must-not-drive-rendering"',
    "hero analytics attribute preserved",
  )

  const faqMarkup = renderToStaticMarkup(
    React.createElement(FAQBlockRenderer, {
      block: {
        blockType: "faq",
        analytics: { sectionVariant: "mamba-faq-1" },
        items: [{ question: inlineText("Question?"), answer: blockText("Answer.") }],
      },
      options: { index: 1 },
    }),
  )

  assertIncludes(faqMarkup, "cms-block--source-mamba-faq-1", "FAQ legacy fallback class")
  assertIncludes(faqMarkup, 'data-source-variant="mambaFaq1"', "FAQ legacy fallback data source variant")
  assertIncludes(faqMarkup, 'data-siab-section-variant="mamba-faq-1"', "FAQ analytics attribute preserved")

  const pricingMarkup = renderToStaticMarkup(
    React.createElement(PricingBlockRenderer, {
      block: {
        blockType: "pricing",
        analytics: { sectionVariant: "tailwind-plus-simple-pricing" },
        title: inlineText("Plans"),
        plans: [
          {
            title: inlineText("Starter"),
            price: "EUR 499",
            features: [{ label: inlineText("One page"), included: true }],
            cta: { label: "Start", href: "/intake" },
          },
        ],
      },
      options: { index: 2 },
    }),
  )

  assertIncludes(pricingMarkup, "cms-block--source-tailwind-plus-simple-pricing", "pricing legacy fallback class")
  assertIncludes(pricingMarkup, "!rounded-3xl", "pricing native Tailwind Plus card class")
  assertIncludes(pricingMarkup, 'data-source-variant="tailwindPlusSimpleTiers"', "pricing data source variant")
  assertIncludes(pricingMarkup, "EUR 499", "pricing structured content")

  const amicareHeroMarkup = renderToStaticMarkup(
    React.createElement(HeroBlockRenderer, {
      block: {
        blockType: "hero",
        variant: "amicareZenHero",
        analytics: { sectionVariant: "amicare-zen-hero" },
        eyebrow: inlineText("Amicare-Zorg"),
        headline: inlineText("Jeugdzorg met hart"),
        image: { url: "/media/bedroom.jpg", alt: "Rustige kinderkamer" },
      },
      options: { index: 3 },
    }),
  )

  assertIncludes(amicareHeroMarkup, "cms-block--source-amicare-zen-hero", "Amicare hero class")
  assertIncludes(amicareHeroMarkup, 'data-source-variant="amicareZenHero"', "Amicare hero data source variant")
  assertIncludes(amicareHeroMarkup, "Jeugdzorg met hart", "Amicare hero structured content")

  const comparisonMarkup = renderToStaticMarkup(
    React.createElement(ComparisonBlockRenderer, {
      block: {
        blockType: "comparison",
        variant: "matrix",
        title: inlineText("Compare"),
        columns: [{ title: inlineText("Starter") }, { title: inlineText("Growth") }],
        rows: [{ label: "Custom domain", values: [true, false] }],
      },
      options: { index: 4 },
    }),
  )

  assertIncludes(comparisonMarkup, 'data-source-variant="matrix"', "comparison SIAB-owned variant data attribute")
  assertIncludes(comparisonMarkup, "Custom domain", "comparison structured row")
}

function runChromeRenderTests() {
  const headerMarkup = renderToStaticMarkup(
    React.createElement(SiteHeader, {
      settings: v1FixtureSettings,
      currentSlug: "index",
    }),
  )
  assertIncludes(headerMarkup, "site-header--source-hyperui-simple", "header source-backed class")
  assertIncludes(headerMarkup, "!max-w-7xl", "header native HyperUI layout class")
  assertIncludes(headerMarkup, 'data-source-variant="hyperUiSimple"', "header data source variant")
  assertIncludes(headerMarkup, "Example Site", "header structured brand")

  const bannerMarkup = renderToStaticMarkup(
    React.createElement(SiteBanner, {
      settings: v1FixtureSettings,
      currentSlug: "index",
    }),
  )
  assertIncludes(bannerMarkup, "site-banner--source-hyperui-simple", "banner source-backed class")
  assertIncludes(bannerMarkup, 'data-source-variant="hyperUiSimple"', "banner data source variant")
  assertIncludes(bannerMarkup, "Reusable chrome variants", "banner structured message")
  assertIncludes(bannerMarkup, 'data-dismissible="true"', "banner dismissible attribute")

  const footerMarkup = renderToStaticMarkup(
    React.createElement(SiteFooter, {
      settings: v1FixtureSettings,
      currentSlug: "index",
    }),
  )
  assertIncludes(footerMarkup, "site-footer--source-hyperui-simple", "footer source-backed class")
  assertIncludes(footerMarkup, 'data-source-variant="hyperUiSimple"', "footer data source variant")
  assertIncludes(footerMarkup, "Typed fixture data", "footer structured tagline")

  const amicareHeaderMarkup = renderToStaticMarkup(
    React.createElement(SiteHeader, {
      settings: amicareSiteGenerationSpec.settings,
      currentSlug: "index",
    }),
  )
  assertIncludes(amicareHeaderMarkup, "site-header--source-amicare-zen", "Amicare header class")
  assertIncludes(amicareHeaderMarkup, 'data-source-variant="amicareZen"', "Amicare header data source variant")
  assertIncludes(amicareHeaderMarkup, "Werkwijze", "Amicare header structured nav")

  const amicareFooterMarkup = renderToStaticMarkup(
    React.createElement(SiteFooter, {
      settings: amicareSiteGenerationSpec.settings,
      currentSlug: "index",
    }),
  )
  assertIncludes(amicareFooterMarkup, "site-footer--source-amicare-zen", "Amicare footer class")
  assertIncludes(amicareFooterMarkup, "KVK 99968347", "Amicare footer structured business data")

  const amblastHeaderMarkup = renderToStaticMarkup(
    React.createElement(SiteHeader, {
      settings: amblastSiteGenerationSpec.settings,
      currentSlug: "diensten",
    }),
  )
  assertIncludes(amblastHeaderMarkup, "site-header--source-amblast-industrial", "Amblast header class")
  assertIncludes(amblastHeaderMarkup, 'data-source-variant="amblastIndustrial"', "Amblast header data source variant")
  assertIncludes(amblastHeaderMarkup, "Onze diensten", "Amblast header structured nav")
  assertIncludes(amblastHeaderMarkup, 'aria-current="page"', "Amblast header path active state")

  const amblastFooterMarkup = renderToStaticMarkup(
    React.createElement(SiteFooter, {
      settings: amblastSiteGenerationSpec.settings,
      currentSlug: "index",
    }),
  )
  assertIncludes(amblastFooterMarkup, "site-footer--source-amblast-industrial", "Amblast footer class")
  assertIncludes(amblastFooterMarkup, "Manage your facility", "Amblast footer structured tagline")
  assertIncludes(amblastFooterMarkup, "BTW ID: NL002407752B08", "Amblast footer structured business data")

  assertEqual(GeneratedSiteSettingsSchema.safeParse(v1FixtureSettings).success, true, "fixture chrome validates")
  assertEqual(GeneratedSiteSettingsSchema.safeParse(amicareSiteGenerationSpec.settings).success, true, "Amicare chrome validates")
  assertEqual(GeneratedSiteSettingsSchema.safeParse(amblastSiteGenerationSpec.settings).success, true, "Amblast chrome validates")
  assertEqual(
    GeneratedSiteSettingsSchema.safeParse({
      ...v1FixtureSettings,
      chrome: {
        ...v1FixtureSettings.chrome,
        header: {
          ...v1FixtureSettings.chrome?.header,
          variant: "notApproved",
        },
      },
    }).success,
    false,
    "unsupported chrome variant rejects",
  )
  assertEqual(
    GeneratedSiteSettingsSchema.safeParse({
      ...v1FixtureSettings,
      chrome: {
        ...v1FixtureSettings.chrome,
        banner: {
          ...v1FixtureSettings.chrome?.banner,
          variant: "amblastIndustrial",
        },
      },
    }).success,
    false,
    "tenant-exclusive chrome variants reject on banners",
  )
  assertEqual(
    GeneratedSiteSettingsSchema.safeParse({
      ...v1FixtureSettings,
      chrome: {
        ...v1FixtureSettings.chrome,
        banner: {
          ...v1FixtureSettings.chrome?.banner,
          rawHtml: "<div>not allowed</div>",
        },
      },
    }).success,
    false,
    "raw chrome source rejects",
  )
}

function runAmicareScopeTests() {
  const amicareBlockVariants = [
    ["hero", "hero:amicareZenHero"],
    ["featureList", "featureList:amicareCareCards"],
    ["richText", "richText:amicareEditorial"],
    ["cta", "cta:amicareQuoteContact"],
    ["contactSection", "contactSection:amicareContactForm"],
    ["faq", "faq:amicareWarmAccordion"],
    ["testimonials", "testimonials:amicareStoryCards"],
  ] as const

  for (const [slug, variantId] of amicareBlockVariants) {
    const variant = SITE_GENERATION_BLOCK_CATALOG_BY_SLUG[slug].variants.find((entry) => entry.id === variantId)
    assertEqual(Boolean(variant), true, `${variantId} exists`)
    assertEqual(variant?.scope.kind, "tenant-exclusive", `${variantId} is tenant-exclusive`)
    assertEqual(variant?.scope.kind === "tenant-exclusive" && variant.scope.tenantSlugs.includes("amicare"), true, `${variantId} scoped to amicare`)
    assertEqual(SITE_SOURCE_BACKED_BLOCK_VARIANTS.some((entry) => entry.variantId === variantId), false, `${variantId} excluded from reusable source-backed variants`)
  }

  for (const variantId of ["header:amicareZen", "footer:amicareZen"]) {
    const variant = SITE_CHROME_CATALOG.find((entry) => entry.id === variantId)
    assertEqual(Boolean(variant), true, `${variantId} exists`)
    assertEqual(variant?.scope.kind, "tenant-exclusive", `${variantId} is tenant-exclusive`)
    assertEqual(SITE_SOURCE_BACKED_CHROME_VARIANTS.some((entry) => entry.variantId === variantId), false, `${variantId} excluded from reusable chrome variants`)
  }
}

function runAmblastScopeTests() {
  const amblastBlockVariants = [
    ["mediaHero", "mediaHero:amblastShapedHero"],
    ["infoCardList", "infoCardList:amblastImageBoxes"],
    ["serviceCarousel", "serviceCarousel:amblastSwiperServices"],
    ["beforeAfterGallery", "beforeAfterGallery:amblastPortfolio"],
    ["contactDetails", "contactDetails:amblastContactCards"],
  ] as const

  for (const [slug, variantId] of amblastBlockVariants) {
    const variant = SITE_GENERATION_BLOCK_CATALOG_BY_SLUG[slug].variants.find((entry) => entry.id === variantId)
    assertEqual(Boolean(variant), true, `${variantId} exists`)
    assertEqual(variant?.scope.kind, "tenant-exclusive", `${variantId} is tenant-exclusive`)
    assertEqual(variant?.scope.kind === "tenant-exclusive" && variant.scope.tenantSlugs.includes("amblast"), true, `${variantId} scoped to amblast`)
    assertEqual(SITE_SOURCE_BACKED_BLOCK_VARIANTS.some((entry) => entry.variantId === variantId), false, `${variantId} excluded from reusable source-backed variants`)
  }

  for (const variantId of ["header:amblastIndustrial", "footer:amblastIndustrial"]) {
    const variant = SITE_CHROME_CATALOG.find((entry) => entry.id === variantId)
    assertEqual(Boolean(variant), true, `${variantId} exists`)
    assertEqual(variant?.scope.kind, "tenant-exclusive", `${variantId} is tenant-exclusive`)
    assertEqual(variant?.scope.kind === "tenant-exclusive" && variant.scope.tenantSlugs.includes("amblast"), true, `${variantId} scoped to amblast`)
    assertEqual(SITE_SOURCE_BACKED_CHROME_VARIANTS.some((entry) => entry.variantId === variantId), false, `${variantId} excluded from reusable chrome variants`)
  }

  assertEqual(amblastSiteGenerationSpec.tenant.domain, "amblast.optidigi.nl", "Amblast fixture tenant domain")
  assertEqual(amblastSiteGenerationSpec.settings.siteUrl, "https://amblast.optidigi.nl", "Amblast fixture site URL")

  const homeBlocks = amblastSiteGenerationSpec.pages.find((page) => page.slug === "index")?.blocks ?? []
  assertEqual(homeBlocks.some((block) => block.blockType === "serviceCarousel" && block.variant === "amblastSwiperServices"), true, "Amblast home service carousel fixture")
  assertEqual(homeBlocks.some((block) => block.blockType === "infoCardList" && block.variant === "amblastImageBoxes"), true, "Amblast home info boxes fixture")

  const portfolioBlocks = amblastSiteGenerationSpec.pages.find((page) => page.slug === "portfolio")?.blocks ?? []
  assertEqual(portfolioBlocks.some((block) => block.blockType === "beforeAfterGallery" && block.variant === "amblastPortfolio"), true, "Amblast portfolio comparison fixture")
}

function runLegacyRendererDispatchTests() {
  assertEqual(
    resolveLegacyTenant({
      tenantSlug: "amicare",
      domain: "amicare.optidigi.nl",
      settings: amicarePublishedSiteSnapshot.settings,
    }),
    "amicare",
    "Amicare tenant resolves to legacy renderer",
  )
  assertEqual(
    resolveLegacyTenant({
      tenantSlug: "fixture-studio",
      domain: "renderer.example.test",
      settings: v1FixtureSettings,
    }),
    null,
    "generic fixture does not resolve to legacy renderer",
  )
  assertEqual(
    resolveLegacyTenant({
      tenantSlug: "generic-amblast-inspired",
      domain: "generic.example.test",
      settings: {
        ...v1FixtureSettings,
        siteName: "Amblast style landing page",
        siteUrl: "https://amblast.nl",
        chrome: {
          ...v1FixtureSettings.chrome,
          header: { ...v1FixtureSettings.chrome?.header, variant: "amblastIndustrial" },
          footer: { ...v1FixtureSettings.chrome?.footer, variant: "amblastIndustrial" },
        },
      },
    }),
    null,
    "generic tenant with Amblast-looking mutable settings does not resolve to legacy renderer",
  )
  assertEqual(
    resolveLegacyTenant({
      tenantSlug: "generic-care-provider",
      domain: "generic-care.example.test",
      settings: {
        ...v1FixtureSettings,
        siteName: "Amicare inspired zorg",
        siteUrl: "https://ami-care.nl",
        chrome: {
          ...v1FixtureSettings.chrome,
          header: { ...v1FixtureSettings.chrome?.header, variant: "amicareZen" },
          footer: { ...v1FixtureSettings.chrome?.footer, variant: "amicareZen" },
        },
      },
    }),
    null,
    "generic tenant with Amicare-looking mutable settings does not resolve to legacy renderer",
  )
  assertEqual(
    resolveLegacyTenant({
      tenantSlug: "amblast",
      domain: "amblast.optidigi.nl",
      settings: amblastPublishedSiteSnapshot.settings,
    }),
    "amblast",
    "Amblast tenant resolves to legacy renderer",
  )

  const amicareFixturePage = amicarePublishedSiteSnapshot.pages.find((page) => page.slug === "index")
  if (!amicareFixturePage) throw new Error("Amicare published fixture index page exists")
  const amicarePage = {
    ...amicareFixturePage,
    updatedAt: amicareFixturePage.updatedAt ?? amicarePublishedSiteSnapshot.publishedAt ?? "2026-01-01T00:00:00.000Z",
  } satisfies Page

  const amicareMarkup = renderToStaticMarkup(
    React.createElement(SitePageRenderer, {
      page: amicarePage,
      settings: amicarePublishedSiteSnapshot.settings,
      theme: amicarePublishedSiteSnapshot.theme,
      tenantSlug: amicarePublishedSiteSnapshot.tenantSlug,
      domain: amicarePublishedSiteSnapshot.domain,
    }),
  )
  assertIncludes(amicareMarkup, 'data-legacy-tenant="amicare"', "Amicare legacy root attribute")
  assertIncludes(amicareMarkup, "data-amicare-nav", "Amicare exact nav marker")
  assertIncludes(amicareMarkup, "cms-block--cta-quote", "Amicare exact quote CTA class")
  assertIncludes(amicareMarkup, "cookie-consent-banner", "Amicare cookie consent markup")
  assertIncludes(amicareMarkup, 'src="/media/toys.jpg"', "Amicare exact hero image")
  assertIncludes(amicareMarkup, 'src="/api/tenant-media/7/bedroom.jpg"', "Amicare exact quote background image")
  assertIncludes(amicareMarkup, "Voor jongeren en gezinnen", "Amicare exact hero eyebrow")
  assertIncludes(amicareMarkup, "Wat voor mij", "Amicare exact feature heading")
  assertIncludes(amicareMarkup, "Aandacht", "Amicare exact first feature")
  assertIncludes(amicareMarkup, "Betrokkenheid", "Amicare exact second feature")
  assertIncludes(amicareMarkup, "Continuïteit", "Amicare exact third feature")
  assertIncludes(amicareMarkup, 'Het vak  mijn <em class="rt-i">hart ligt</em>.', "Amicare exact captured rich-text heading")
  assertIncludes(amicareMarkup, "Vertrouwen ontstaat in de tijd", "Amicare exact quote CTA")
  assertIncludes(amicareMarkup, "info@ami-care.nl", "Amicare exact contact email")
  assertExcludes(amicareMarkup, "Het vak waar mijn", "Amicare excludes non-captured rich-text heading")
  assertExcludes(amicareMarkup, "Ervaringen", "Amicare excludes generated testimonials section")
  assertExcludes(amicareMarkup, "Veelgestelde vragen", "Amicare excludes generated FAQ section")
  assertExcludes(amicareMarkup, "<form", "Amicare excludes generated contact form")
  assertEqual(
    amicareMarkup.includes("site-header--source-amicare-zen"),
    false,
    "Amicare legacy renderer bypasses generic chrome approximation",
  )

  const amblastHomeFixturePage = amblastPublishedSiteSnapshot.pages.find((page) => page.slug === "index")
  if (!amblastHomeFixturePage) throw new Error("Amblast published fixture index page exists")
  const amblastHomePage = {
    ...amblastHomeFixturePage,
    updatedAt: amblastHomeFixturePage.updatedAt ?? amblastPublishedSiteSnapshot.publishedAt ?? "2026-01-01T00:00:00.000Z",
  } satisfies Page

  const amblastHomeMarkup = renderToStaticMarkup(
    React.createElement(SitePageRenderer, {
      page: amblastHomePage,
      settings: amblastPublishedSiteSnapshot.settings,
      theme: amblastPublishedSiteSnapshot.theme,
      tenantSlug: amblastPublishedSiteSnapshot.tenantSlug,
      domain: amblastPublishedSiteSnapshot.domain,
    }),
  )
  assertIncludes(amblastHomeMarkup, 'data-legacy-tenant="amblast"', "Amblast legacy root attribute")
  assertIncludes(amblastHomeMarkup, 'data-amblast-page-id="845"', "Amblast home exact page ID")
  assertIncludes(amblastHomeMarkup, 'id="amb-page-flag"', "Amblast exact page wrapper")
  assertIncludes(amblastHomeMarkup, "amb-page-home", "Amblast home body class preserved on wrapper")
  assertIncludes(amblastHomeMarkup, "amb-info-carousel", "Amblast service carousel exact class")
  assertIncludes(amblastHomeMarkup, "swiper-wrapper", "Amblast carousel swiper structure")
  assertIncludes(amblastHomeMarkup, 'data-amblast-behavior="site-client"', "Amblast behavior bootstrap")
  assertEqual(
    amblastHomeMarkup.includes("site-header--source-amblast-industrial"),
    false,
    "Amblast legacy renderer bypasses generic chrome approximation",
  )

  const amblastPortfolioFixturePage = amblastPublishedSiteSnapshot.pages.find((page) => page.slug === "portfolio")
  if (!amblastPortfolioFixturePage) throw new Error("Amblast published fixture portfolio page exists")
  const amblastPortfolioPage = {
    ...amblastPortfolioFixturePage,
    updatedAt: amblastPortfolioFixturePage.updatedAt ?? amblastPublishedSiteSnapshot.publishedAt ?? "2026-01-01T00:00:00.000Z",
  } satisfies Page
  const amblastPortfolioMarkup = renderToStaticMarkup(
    React.createElement(SitePageRenderer, {
      page: amblastPortfolioPage,
      settings: amblastPublishedSiteSnapshot.settings,
      theme: amblastPublishedSiteSnapshot.theme,
      tenantSlug: amblastPublishedSiteSnapshot.tenantSlug,
      domain: amblastPublishedSiteSnapshot.domain,
    }),
  )
  assertIncludes(amblastPortfolioMarkup, 'data-amblast-page-id="886"', "Amblast portfolio exact page ID")
  assertIncludes(amblastPortfolioMarkup, 'data-widget_type="amb-compare.default"', "Amblast portfolio comparison widget")
  assertIncludes(amblastPortfolioMarkup, "amb-compare-handle", "Amblast before-after handle")
  assertIncludes(amblastPortfolioMarkup, "Voor", "Amblast before label")
  assertIncludes(amblastPortfolioMarkup, "Na", "Amblast after label")

  const genericMarkup = renderToStaticMarkup(
    React.createElement(SitePageRenderer, {
      page: v1FixturePage,
      settings: v1FixtureSettings,
    }),
  )
  assertEqual(genericMarkup.includes("data-legacy-tenant="), false, "generic fixture has no legacy root")
  assertEqual(genericMarkup.includes("data-amicare-nav"), false, "generic fixture has no Amicare nav")
  assertEqual(genericMarkup.includes("cookie-consent-banner"), false, "generic fixture has no Amicare cookie consent")
  assertEqual(genericMarkup.includes("amb-page-flag"), false, "generic fixture has no Amblast wrapper")
  assertEqual(genericMarkup.includes("amb-info-carousel"), false, "generic fixture has no Amblast carousel")

  const genericLegacyNameMarkup = renderToStaticMarkup(
    React.createElement(SitePageRenderer, {
      page: v1FixturePage,
      settings: {
        ...v1FixtureSettings,
        siteName: "Amblast style landing page",
        siteUrl: "https://amblast.nl",
      },
      tenantSlug: "generic-amblast-inspired",
      domain: "generic.example.test",
    }),
  )
  assertEqual(genericLegacyNameMarkup.includes("data-legacy-tenant="), false, "legacy-looking generic tenant has no legacy root")
  assertEqual(genericLegacyNameMarkup.includes("amb-page-flag"), false, "legacy-looking generic tenant has no Amblast wrapper")
}

runVariantResolverTests()
runBlockRenderTests()
runChromeRenderTests()
runAmicareScopeTests()
runAmblastScopeTests()
runLegacyRendererDispatchTests()
