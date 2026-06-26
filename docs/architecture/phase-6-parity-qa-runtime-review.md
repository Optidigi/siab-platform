# Phase 6 Parity QA And Runtime Review

Date: 2026-06-26

Scope: verify the migrated Amicare/Amblast snapshot data can actually reach the
generic renderer path for staging hosts, and make bounded runtime fixes where the
route/publish path blocked that.

## Research Summary

- `apps/cms/scripts/seed-renderer-staging-tenants.ts` previously applied only the
  CMS-safe `SiteGenerationSpec` fixtures, then published through the normal CMS
  draft-page snapshot builder.
- That normal publish path is correct for future generated sites, but it cannot
  publish Amblast parity blocks yet because the CMS importer/editor still stores
  only the canonical block set.
- The richer `amicarePublishedSiteSnapshot` and `amblastPublishedSiteSnapshot`
  fixtures were therefore validated by tests but were not what staging hosts
  would serve after running the seed script.
- `apps/renderer` does not ship tenant media files and has no `/uploads`,
  `/assets`, or `/media` public proxy. Relative legacy media URLs would resolve
  against the renderer origin and 404.
- Amicare legacy media is served from `/media/<filename>` by its legacy app, not
  from `/assets/<filename>`.

## Implemented Shape

- Added `retargetPublishedSiteSnapshot()` as a generic helper for taking a
  validated published snapshot fixture and retargeting tenant id, slug, domain,
  site URL, aliases, version, and publish time.
- The helper can also rewrite root-relative media URL fields to a configured
  `mediaBaseUrl`. Staging Amicare/Amblast snapshots now keep canonical/page URLs
  on `*.optidigi.nl` while loading legacy media from `ami-care.nl` or
  `amblast.nl`.
- The renderer staging seed script now uses the migrated published snapshot
  fixtures for `--publish`; it still applies the CMS-safe spec first so draft
  CMS data and generation-run traceability remain present.
- Amicare fixture media refs now use `/media/bedroom.jpg` and `/media/toys.jpg`,
  matching the legacy media route.

## Review Notes

- This does not add tenant-specific renderer branches, tenant source folders,
  workflows, or Docker images.
- The normal `publishSiteSnapshot()` path is left intact for generated sites. The
  retargeted fixture publish path is scoped to the explicit renderer staging seed
  script for legacy migration proof hosts.
- Production renderer fixture fallback remains safe: fixture mode is disabled in
  production, and missing `SIAB_CMS_URL` errors instead of serving fixture data.
- Final domain cutover still needs a platform-owned media storage/proxy strategy.
  The staging proof can load media from old legacy tenant hosts while those
  images remain deployed, but the final `ami-care.nl`/`amblast.nl` renderer
  cutover should not depend on the old app at the same host.
- Amblast Web3Forms markup is represented without `access_key`. Actual form
  submission needs a secret-safe server-side/provider integration before final
  production cutover.
- Browser visual comparison remains required after deploying the new image and
  reseeding/activating the staging snapshots.

## Verification

- `pnpm --dir apps/cms --ignore-workspace test tests/unit/tenant-generation-fixtures.test.ts tests/unit/renderer-snapshot-route.test.ts tests/unit/publishedSiteSnapshots.test.ts`
  passed.
- `pnpm --dir apps/cms --ignore-workspace test tests/unit/publishedSiteSnapshots.test.ts`
  passed.
- `pnpm --dir apps/cms --ignore-workspace typecheck` passed.
- `pnpm renderer:typecheck` passed.
- `pnpm renderer:build` passed. Vite emitted the existing lucide `use client`
  directive warnings.
- `pnpm packages:typecheck` passed.
- `pnpm --dir apps/cms --ignore-workspace seed:renderer-staging --tenant=amblast`
  dry-run passed.
- `pnpm --dir apps/cms --ignore-workspace seed:renderer-staging --tenant=amicare`
  dry-run passed.
- CMS commands emitted the known local Node engine warning because this shell is
  Node `v24.13.1` and `apps/cms` expects Node `>=26 <27`.
