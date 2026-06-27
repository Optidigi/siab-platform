# Amicare And Amblast Exact Renderer Migration Plan

## Objective

Migrate `sites/ami-care` and `sites/amblast` into the generic renderer without
changing their visual output or behavior.

The previous renderer staging work translated both sites into generic structured
blocks with tenant-flavored CSS. That is not exact parity. This plan replaces
that approximation with tenant-exclusive renderer components derived from the
existing Astro/CSS/JS source.

## Locked Decisions

- Amicare and Amblast are legacy tenant migrations, not examples for future
  generated sites.
- Their custom renderer components are exclusive to those tenants.
- Their styling must come from the existing tenant source files, scoped so it
  cannot affect CMS UI or future generated sites.
- Their behavior must preserve existing client-side behavior, including mobile
  nav, active-section behavior, forms, animations, carousel behavior, cookie
  consent, comparison widgets, SEO, and JSON-LD where present.
- Future generated sites still use approved catalog/provider blocks. These
  tenant-exclusive components must not be exported into the reusable generation
  catalog.
- The renderer still serves published snapshots. Draft CMS edits do not affect
  live output until republished.

## Current Source Reality

Amicare source:

- `sites/ami-care/src/layouts/BaseLayout.astro`
- `sites/ami-care/src/components/Nav.tsx`
- `sites/ami-care/src/components/Footer.astro`
- `sites/ami-care/src/components/CookieConsent.astro`
- `sites/ami-care/src/components/MaintenanceBanner.astro`
- `sites/ami-care/src/components/cms/*.tsx`
- `sites/ami-care/src/styles/global.css`
- `sites/ami-care/src/styles/rich-text.css`
- `sites/ami-care/src/lib/analytics/runtime.ts`
- `sites/ami-care/src/lib/cms.ts`
- `sites/ami-care/src/lib/richText.ts`

Amblast source:

- `sites/amblast/src/layouts/BaseLayout.astro`
- `sites/amblast/src/components/layout/Header.astro`
- `sites/amblast/src/components/layout/Footer.astro`
- `sites/amblast/src/pages/index.astro`
- `sites/amblast/src/pages/over-ons.astro`
- `sites/amblast/src/pages/diensten.astro`
- `sites/amblast/src/pages/portfolio.astro`
- `sites/amblast/src/pages/contact.astro`
- `sites/amblast/src/styles/global.css`
- `sites/amblast/src/styles/amb-base.css`
- `sites/amblast/src/scripts/site.client.ts`
- `sites/amblast/src/content/site.ts`

Current renderer approximation to replace or quarantine:

- `packages/contracts/src/fixtures/tenants.ts`
- `packages/contracts/src/block-catalog.ts`
- `packages/site-renderer/src/styles.css` tenant-specific sections
- `packages/site-renderer/src/blocks/*` generic parity blocks
- `packages/site-renderer/src/chrome.tsx` tenant-specific chrome mappings

## Target Shape

`packages/site-renderer` should gain a tenant-exclusive legacy renderer layer:

```txt
packages/site-renderer/src/legacy-tenants/
  amicare/
    AmicarePage.tsx
    blocks/*
    chrome/*
    styles.css
    behavior.ts
    schema.ts
  amblast/
    AmblastPage.tsx
    sections/*
    chrome/*
    styles.css
    behavior.ts
    schema.ts
```

The renderer dispatch should be explicit:

```txt
PublishedSiteSnapshot tenant.slug/domain
  -> generic catalog renderer for normal generated sites
  -> legacy Amicare exact renderer for amicare-renderer / final amicare tenant
  -> legacy Amblast exact renderer for amblast-renderer / final amblast tenant
```

The snapshot data still carries editable structured fields, but legacy renderers
own exact markup, classes, CSS, and behavior.

## Phase 1: Baseline Audit And Parity Contract Agent

Owner: one medium-effort subagent.

### Research

- Run local builds for both legacy sites:
  - `pnpm tenant:amicare:build`
  - `pnpm tenant:amblast:build`
- Capture desktop and mobile screenshots for:
  - Amicare `/`
  - Amblast `/`
  - Amblast `/over-ons`
  - Amblast `/diensten`
  - Amblast `/portfolio`
  - Amblast `/contact`
- Inventory all interactive behavior:
  - Amicare nav active section and mobile menu
  - Amicare cookie consent and analytics runtime
  - Amblast mobile nav
  - Amblast animation visibility behavior
  - Amblast swiper/carousel behavior
  - Amblast before/after comparison behavior
  - Amblast contact form behavior
- Inventory all assets and URL rewrites needed for renderer staging domains.

### Implement

- Create a parity inventory doc with:
  - exact source file per page/section/component
  - CSS file and selector dependency
  - JS dependency
  - editable fields required by CMS
  - non-editable structural fields
  - media dependencies
- Define an acceptance threshold:
  - screenshot diff target: exact or documented unavoidable difference
  - page behavior checklist
  - HTML/selector presence checklist

### Review/Test

- Architect reviews the inventory against source files.
- No renderer implementation starts until this phase marks every page/section
  as exact-source-mapped.

## Phase 2: Legacy Renderer Isolation Agent

Owner: one medium-effort subagent.

### Research

- Inspect `packages/site-renderer/src/SitePageRenderer.tsx`, `chrome.tsx`, and
  app renderer entrypoints.
- Determine the smallest dispatch layer needed for tenant-exclusive legacy
  renderers.
- Determine how to import tenant CSS in `apps/renderer` without leaking into
  CMS admin or generic generated sites.

### Implement

- Add an explicit legacy renderer dispatch API in `packages/site-renderer`.
- Add scoped CSS import strategy:
  - renderer can load legacy CSS
  - CMS preview/canvas can load it only inside preview/canvas route scope
  - no legacy CSS imported into global CMS admin layouts
- Add tenant root classes/data attributes:
  - `data-legacy-tenant="amicare"`
  - `data-legacy-tenant="amblast"`
- Add tests proving generic sites do not receive legacy renderer classes.

### Review/Test

- Run:
  - `pnpm --dir packages/site-renderer test`
  - `pnpm renderer:typecheck`
  - `pnpm cms:typecheck`
- Architect verifies no broad CSS selectors can affect CMS UI.

## Phase 3: Amicare Exact Component Port Agent

Owner: one medium-effort subagent.

### Research

- Read all Amicare source files listed above.
- Map each existing component to a renderer component:
  - `BaseLayout.astro` -> legacy page shell
  - `Nav.tsx` -> exact Amicare header component
  - `Footer.astro` -> exact Amicare footer component
  - `components/cms/Hero.tsx` -> exact editable hero block
  - `FeatureList.tsx` -> exact editable feature block
  - `RichText.tsx` and `RtNodeRenderer.tsx` -> exact rich text renderer
  - `CTA.tsx` -> exact CTA block
  - `Testimonials.tsx` -> exact testimonials block
  - `FAQ.tsx` -> exact FAQ block
  - `ContactSection.tsx` -> exact contact block
  - `CookieConsent.astro` and analytics runtime -> behavior port
- Identify fields currently read from CMS via `sites/ami-care/src/lib/cms.ts`.

### Implement

- Port Amicare components into `packages/site-renderer/src/legacy-tenants/amicare`.
- Preserve class names and CSS from `sites/ami-care/src/styles/global.css` and
  `rich-text.css`, scoped under the Amicare legacy root.
- Preserve behavior from `Nav.tsx`, cookie consent, and analytics runtime.
- Convert data inputs to snapshot-backed structured props.
- Replace current Amicare approximation fixtures with exact legacy component
  snapshot data.

### Review/Test

- Unit tests verify the legacy Amicare renderer emits key original classes,
  content, links, media, and data attributes.
- Browser tests compare:
  - legacy `ami-care.nl` or local legacy build
  - renderer `amicare.optidigi.nl` or local renderer host
- Test desktop and mobile screenshots.
- Test nav active state and mobile menu.
- Test form markup and analytics/cookie behavior.

## Phase 4: Amblast Exact Page/Section Port Agent

Owner: one medium-effort subagent.

### Research

- Read all Amblast pages and layout files.
- Split each Astro page into exact renderer-owned sections while preserving:
  - original `amb-*` class names
  - body classes
  - section IDs/data IDs/data settings
  - shape-divider SVGs
  - animation marker classes
  - image-set background behavior
  - swiper/comparison/form behavior
- Identify editable content fields per section:
  - headings
  - rich text
  - CTA labels/hrefs
  - service cards
  - contact details
  - portfolio comparison images
  - contact form labels/provider config
  - SEO/JSON-LD

### Implement

- Port Amblast into `packages/site-renderer/src/legacy-tenants/amblast`.
- Use exact component splits, not generic block approximations:
  - layout/header/footer
  - home hero
  - home contact info strip
  - services carousel
  - industry content sections
  - CTA/contact form section
  - about page sections
  - diensten page sections
  - portfolio comparison sections
  - contact details/form page sections
- Preserve `sites/amblast/src/styles/global.css` and `amb-base.css` with
  selector behavior intact and scoped to Amblast legacy root/body class model.
- Preserve `sites/amblast/src/scripts/site.client.ts` behavior or rewrite it
  only where necessary to run inside renderer without changing behavior.
- Replace current Amblast approximation fixtures with exact legacy component
  snapshot data.

### Review/Test

- Unit tests verify exact `amb-*` class and data attribute output for every page.
- Browser tests compare legacy and renderer screenshots:
  - `/`
  - `/over-ons`
  - `/diensten`
  - `/portfolio`
  - `/contact`
- Behavior tests:
  - mobile nav opens/closes
  - carousel moves/autoplay/pagination behavior matches acceptable source
  - before/after comparison works
  - contact form posts to configured provider/fallback without exposing secrets
- Screenshot diffs must be reviewed by the architect.

## Phase 5: CMS Editability And Snapshot Data Agent

Owner: one medium-effort subagent.

### Research

- Review current CMS block schemas and importer behavior.
- Identify which existing generic CMS fields can drive the legacy components.
- Identify tenant-exclusive fields that need schema additions.

### Implement

- Add only necessary tenant-exclusive schema fields.
- Ensure CMS can edit the content/metadata/tokens required by exact legacy
  components without exposing arbitrary HTML/code.
- Ensure importer/seed creates:
  - tenants
  - site settings
  - pages
  - exact legacy sections/blocks
  - SEO
  - media refs
  - theme tokens where truly used
- Ensure import remains idempotent.
- Ensure publish snapshot contains the exact legacy renderer data.

### Review/Test

- CMS unit tests:
  - importer idempotency
  - exact Amicare data import
  - exact Amblast data import
  - publish snapshot data shape
  - draft/live isolation
- Manual CMS check:
  - content fields are editable
  - structural tenant-only fields are not offered as reusable catalog blocks

## Phase 6: End-To-End Renderer Verification Agent

Owner: one medium-effort subagent.

### Research

- Review renderer host/snapshot loading.
- Confirm staging host routing:
  - `amicare.optidigi.nl`
  - `amblast.optidigi.nl`
- Confirm legacy domains remain untouched until final cutover.

### Implement

- Add smoke/e2e tests or scripts that:
  - seed exact snapshots
  - start renderer
  - request root/subpages by host
  - assert known selectors/content/media
  - assert unknown host/path behavior
  - assert draft changes do not affect live until republish
- Add screenshot comparison script output under ignored temp artifacts.

### Review/Test

- Run:
  - `pnpm packages:typecheck`
  - `pnpm cms:typecheck`
  - `pnpm cms:test`
  - `pnpm renderer:typecheck`
  - `pnpm renderer:build`
  - `pnpm tenant:amicare:build`
  - `pnpm tenant:amblast:build`
- Architect reviews screenshots before deployment.

## Phase 7: Deployment And Cutover Readiness Agent

Owner: one medium-effort subagent.

### Research

- Confirm exact image tags and compose files.
- Confirm existing legacy containers stay deployed.
- Confirm staging renderer routes only handle `amicare.optidigi.nl` and
  `amblast.optidigi.nl`.

### Implement

- Deploy CMS and renderer images from exact Git SHA tags.
- Run migrations only after backup.
- Reseed exact snapshots.
- Keep old legacy images and old live routes untouched.

### Review/Test

- Smoke:
  - `https://amicare.optidigi.nl/`
  - `https://amblast.optidigi.nl/`
  - all Amblast subpages
  - unknown path 404
  - unknown host 404 via snapshot API/renderer
  - snapshot API bearer behavior
  - legacy `ami-care.nl` still legacy
  - legacy `amblast.siteinabox.nl` still legacy
- Architect signs off only after screenshot parity is accepted.

## Phase 8: Remove Or Quarantine The Approximation Layer Agent

Owner: one medium-effort subagent.

### Research

- Identify all previous Amicare/Amblast approximation code and fixtures.
- Determine which generic renderer blocks are still useful for future catalog
  generation and which exist only for failed parity migration.

### Implement

- Remove tenant approximation variants that are superseded by exact legacy
  components.
- Keep generic reusable blocks only if they are legitimate catalog blocks.
- Ensure Amicare/Amblast exclusive components remain excluded from the reusable
  generated-site catalog.

### Review/Test

- Tests prove:
  - future generated sites cannot select Amicare/Amblast exclusive components
  - legacy tenant renderer still works
  - reusable catalog remains intact

## Architect Responsibilities

The architect does not delegate sign-off.

For every phase:

- Review source files and subagent diff.
- Run or verify stated tests.
- Inspect desktop and mobile screenshots where visual parity is involved.
- Reject approximations that do not preserve source styling/behavior.
- Keep deploys git/GHCR based.
- Keep prod env edits operator-gated.

## Definition Of Done

This migration is complete only when:

- Amicare renderer output visually matches `sites/ami-care`/current live output
  at accepted desktop and mobile viewports.
- Amblast renderer output visually matches `sites/amblast`/current live output
  for all pages at accepted desktop and mobile viewports.
- Original behavior is preserved or any intentional difference is documented and
  accepted.
- CMS can edit approved content fields for both tenants.
- Exact snapshots publish and activate successfully.
- Renderer serves only active snapshots.
- Draft changes remain isolated from live output.
- CMS admin/dashboard UI does not load renderer/provider/legacy tenant CSS.
- Legacy live containers remain untouched until explicit final cutover.
