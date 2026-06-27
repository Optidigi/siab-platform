# Phase 7 Block Catalog Completeness And Styling-Origin Audit

Date: 2026-06-27

Scope: catalog completeness and styling-origin audit for the data-driven
generated-site block catalog after the provider-source catalog and
Amicare/Amblast parity passes. This report is descriptive only; it does not add
new product features or new block variants.

## Current Totals

- Reusable self-serve/CMS block families: 15 total (`SITE_BLOCK_SLUGS`).
- Legacy/parity-only block families: 5 total (`SITE_PARITY_BLOCK_SLUGS`).
- Renderer-registered block families: 20 total (`SITE_GENERATION_BLOCK_SLUGS`).
- Reusable external source-backed block variants exported to generation: 16 total.
- Source-backed chrome variants: 3 total (`header`, `footer`, `banner`
  `hyperUiSimple`).
- Tenant-exclusive Amicare variants: 7 block variants plus 2 chrome variants.
- Tenant-exclusive Amblast variants: 5 block variants plus 2 chrome variants.
- Header/footer/banner chrome variants are cataloged separately from page blocks.

`SITE_BLOCK_CATALOG` is the reusable self-serve catalog used by normal AI
generation. `SITE_GENERATION_BLOCK_CATALOG` is the broader renderer/runtime
catalog and includes legacy parity-only block families for existing tenant
migration snapshots. The two must not be treated as the same thing.

## Reusable Block Families

| Family | Renderer | CMS config | Source-backed reusable variants |
| --- | --- | --- | --- |
| `hero` | `packages/site-renderer/src/blocks/Hero.tsx` | `apps/cms/src/blocks/Hero.ts` | Tailwind Plus |
| `featureList` | `packages/site-renderer/src/blocks/FeatureList.tsx` | `apps/cms/src/blocks/FeatureList.ts` | Tailwind Plus |
| `testimonials` | `packages/site-renderer/src/blocks/Testimonials.tsx` | `apps/cms/src/blocks/Testimonials.ts` | Mamba UI |
| `faq` | `packages/site-renderer/src/blocks/FAQ.tsx` | `apps/cms/src/blocks/FAQ.ts` | Mamba UI |
| `cta` | `packages/site-renderer/src/blocks/CTA.tsx` | `apps/cms/src/blocks/CTA.ts` | Tailblocks |
| `richText` | `packages/site-renderer/src/blocks/RichText.tsx` | `apps/cms/src/blocks/RichText.ts` | Tailblocks |
| `contactSection` | `packages/site-renderer/src/blocks/ContactSection.tsx` | `apps/cms/src/blocks/ContactSection.ts` | Tailwind Plus, HyperUI, Preline |
| `pricing` | `packages/site-renderer/src/blocks/Pricing.tsx` | `apps/cms/src/blocks/MarketingCatalog.ts` | Tailwind Plus |
| `stats` | `packages/site-renderer/src/blocks/Stats.tsx` | `apps/cms/src/blocks/MarketingCatalog.ts` | Tailwind Plus |
| `logoCloud` | `packages/site-renderer/src/blocks/LogoCloud.tsx` | `apps/cms/src/blocks/MarketingCatalog.ts` | Tailwind Plus |
| `gallery` | `packages/site-renderer/src/blocks/Gallery.tsx` | `apps/cms/src/blocks/MarketingCatalog.ts` | Preline |
| `team` | `packages/site-renderer/src/blocks/Team.tsx` | `apps/cms/src/blocks/MarketingCatalog.ts` | Tailwind Plus |
| `blogCards` | `packages/site-renderer/src/blocks/BlogCards.tsx` | `apps/cms/src/blocks/MarketingCatalog.ts` | Tailwind Plus |
| `processSteps` | `packages/site-renderer/src/blocks/ProcessSteps.tsx` | `apps/cms/src/blocks/MarketingCatalog.ts` | Mamba UI |
| `comparison` | `packages/site-renderer/src/blocks/Comparison.tsx` | `apps/cms/src/blocks/MarketingCatalog.ts` | SIAB-owned |

Renderer registration lives in `packages/site-renderer/src/blocks/index.tsx`.
CMS registration lives in `apps/cms/src/blocks/registry.ts`.

## Tenant-Exclusive Variants

Amicare variants are scoped to `amicare` and `amicare-renderer` only:

- `hero:amicareZenHero`
- `featureList:amicareCareCards`
- `richText:amicareEditorial`
- `cta:amicareQuoteContact`
- `contactSection:amicareContactForm`
- `faq:amicareWarmAccordion`
- `testimonials:amicareStoryCards`
- `header:amicareZen`
- `footer:amicareZen`

Amblast variants are scoped to `amblast` and `amblast-renderer` only:

- `mediaHero:amblastShapedHero`
- `infoCardList:amblastImageBoxes`
- `serviceCarousel:amblastSwiperServices`
- `beforeAfterGallery:amblastPortfolio`
- `contactDetails:amblastContactCards`
- `header:amblastIndustrial`
- `footer:amblastIndustrial`

Tenant-exclusive variants are renderer/runtime data for existing tenant parity.
They are excluded from `SITE_SOURCE_BACKED_BLOCK_VARIANTS`, excluded from normal
AI generation model input, and must not be reused for future generated sites.

## Source Archive

Archived source counts are recorded in
`packages/contracts/block-sources/manifest.json`:

| Source | Archived entries |
| --- | ---: |
| Tailwind Plus free/downloadable | 36 |
| HyperUI | 130 |
| Preline free | 89 |
| Tailblocks | 126 |
| Mamba UI | 16 |

The source archive is raw upstream build material. Generated sites still use
structured block data and renderer-owned variants; they do not generate source
files or tenant-specific code.

## Runtime Mode

Current approved reusable source-backed variants use renderer-owned native
Tailwind/Preline utility maps in
`packages/site-renderer/src/blocks/native-classes.ts`. They do not render
arbitrary provider HTML, AI-provided class strings, or tenant source files.

Runtime styling is split as follows:

- `apps/renderer/src/styles/site.css` enables Tailwind v4 through
  `@tailwindcss/vite`, imports Preline theme/variant CSS through app-local
  `node_modules` paths, enables `@tailwindcss/forms`, and scans
  `packages/site-renderer/src`.
- `apps/cms/src/styles/site-renderer-preview.css` gives CMS preview/customizer
  the same renderer utility coverage without changing the protected
  `apps/cms/src/styles/globals.css` shell.
- `@siteinabox/site-renderer/styles.css` remains the base/fallback renderer CSS
  and the tenant-exclusive Amicare/Amblast parity CSS surface.
- Preline JS is not loaded for the current static Preline variants; future
  interactive Preline blocks must add the supported init route before approval.
- Tailwind Plus Elements is not loaded for current static section variants;
  future interactive Tailwind Plus chrome/menu/dialog variants must add it
  before approval.

## Support Matrix

- Contracts: reusable and parity block shapes are typed in
  `packages/contracts/src/site.ts` and runtime-validated in
  `packages/contracts/src/runtime.ts`.
- CMS editability: all 15 reusable `SITE_BLOCK_SLUGS` have Payload block
  configs and CMS canvas rendering support.
- AI generation: model input and JSON schema expose only reusable
  `SITE_BLOCK_SLUGS` and global chrome variants.
- Preview/customizer: shared `SitePageRenderer` is used directly; no iframe is
  required for catalog rendering.
- Renderer: the generic renderer can serve reusable blocks and tenant parity
  snapshots from structured published snapshot data.

## Remaining Gaps

- Browser screenshot/pixel comparison has not been run for Amicare/Amblast
  parity or provider-derived variants.
- Legacy parity provenance remains `needs-browser-comparison`; these variants
  must stay tenant-exclusive.
- Browser screenshot/pixel comparison should be repeated after deployment for
  the native provider utilities and tenant parity variants.
- Contact form provider behavior still needs final production validation with
  real secrets and deployment environment.
- Future catalog expansion should add more source-backed variants per reusable
  family, but only after structured fields, renderer mapping, CMS editability,
  provenance, and tests are added.

## Audit Sources

- `packages/contracts/src/block-catalog.ts`
- `packages/contracts/src/site.ts`
- `packages/contracts/src/runtime.ts`
- `packages/contracts/block-sources/manifest.json`
- `packages/site-renderer/src/blocks/*`
- `packages/site-renderer/src/chrome.tsx`
- `apps/cms/src/blocks/registry.ts`
- `apps/cms/src/blocks/MarketingCatalog.ts`
- `apps/cms/src/lib/ai-generation/siteGenerationInput.ts`
- `apps/cms/src/lib/ai-generation/providers.ts`
- `apps/cms/tests/unit/blockCatalog.test.ts`
- `apps/cms/tests/unit/siteGenerationCatalogGovernance.test.ts`
