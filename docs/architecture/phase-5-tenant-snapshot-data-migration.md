# Phase 5 Tenant Snapshot Data Migration

Date: 2026-06-26

Scope: encode Amicare and Amblast as renderer-compatible structured data while
keeping CMS-importable `SiteGenerationSpec` fixtures conservative.

## Research Summary

- `sites/ami-care` has one production page with canonical content blocks, static
  bedroom/toys imagery, favicon/manifest assets, PostHog consent behavior, and
  `/api/forms` contact submission.
- `sites/amblast` has five main pages, custom header/footer, shaped image heroes,
  image/info boxes, a Swiper service carousel, two before/after portfolio sliders,
  Web3Forms contact forms, and a larger public asset set under
  `public/uploads`.
- Amblast had an address conflict: `src/content/site.ts`, footer, and `llms.txt`
  use `Heinsbergerweg 172, 6045 CK Roermond`; `src/pages/contact.astro` used
  `Stationspark 189, 6042 AX Roermond`.

## Implemented Shape

- `packages/contracts/src/fixtures/tenants.ts` now keeps each
  `SiteGenerationSpec` importable through the current CMS importer by using the
  canonical block set there.
- Published snapshot fixture data can override the CMS-safe page data. Amblast's
  `PublishedSiteSnapshot` now uses renderer parity blocks:
  `mediaHero`, `infoCardList`, `serviceCarousel`, `beforeAfterGallery`,
  `contactDetails`, and provider-configured `contactSection`.
- Amicare's published snapshot includes richer chrome, footer columns, NAP data,
  PostHog consent settings, JSON-LD settings, media refs, and SIAB form provider
  metadata.
- Amblast's published snapshot includes header/footer chrome, JSON-LD, logo and
  favicon refs, hero refs, service-card icons, info icons, and portfolio
  before/after media refs.
- The Amblast address source of truth is `Heinsbergerweg 172, 6045 CK Roermond`.
  The conflicting `Stationspark 189` copy is not used in migrated data.

## Review Notes

- No legacy tenant source files, tenant folders, tenant workflows, or tenant
  Docker images were added or changed.
- No provider secret is stored in fixture data. Amblast Web3Forms config records
  provider/action/honeypot/messages only; the required access key still needs a
  runtime-safe solution before forms can submit through Web3Forms.
- Public media delivery is not solved by this data migration. Phase 6 adds a
  staging retarget that loads legacy media from the old tenant origins, but final
  domain cutover still needs platform-owned media storage/proxy behavior.
- The current split means CMS draft import remains compatible with existing
  Payload block definitions, while the published snapshot fixture proves richer
  renderer data. A later CMS editor/importer phase is still required if editors
  must directly create or edit the parity block types inside Payload.

## Verification

- `pnpm --dir apps/cms --ignore-workspace test tests/unit/tenant-generation-fixtures.test.ts tests/unit/blockCatalog.test.ts`
  passed.
- `pnpm --dir apps/cms typecheck` passed.
- `pnpm packages:typecheck` passed.
- The shell emitted the known Node engine warning because the repo expects Node
  `>=26 <27` and this workstation is running Node `v24.13.1`.
