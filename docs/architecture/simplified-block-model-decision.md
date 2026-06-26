# Simplified Block Model Decision

Date: 2026-06-26

Phase 0 scope: architecture decision only. This document locks the block model
for the next implementation phases and does not change contracts, CMS schemas,
renderer code, tenant snapshots, or deploy files.

## Decision Summary

SIAB will use a simple concrete block model.

A block is a styled component plus editable content, metadata, and a small set
of allowed token props. Runtime rendering selects a concrete block type and
variant from validated data. It must not infer the rendered component through
fuzzy `analytics.sectionVariant`, provenance fields, source-family dispatch, or
tenant-specific source folders.

Approved block sources are Tailwind Plus/free, Preline free, Tailblocks,
HyperUI, Mamba, shadcn-style blocks, and SIAB-owned custom blocks. Operator
approval confirms SIAB has the required licensing rights for these sources.
These sources should be used the way their catalogs intend: as concrete styled
sections/components adapted into the SIAB renderer with editable props, not as
open-ended code generation inputs.

For Amicare and Amblast parity, use custom styled blocks where the editable
surface is content, specific metadata, and explicitly allowed tokens. Do not
generate tenant source folders. Tenant sites remain CMS/snapshot data rendered
through `packages/site-renderer` and `apps/renderer`.

Provenance may remain useful as catalog metadata for review, licensing, and
audit, but it is not the core runtime rendering model.

## Target Data Shape Examples

External catalog-backed block:

```json
{
  "blockType": "hero",
  "variant": "tailwindPlusSimpleCentered",
  "content": {
    "eyebrow": "Site in a Box",
    "heading": "Launch a managed website from approved blocks",
    "body": "Structured content, reusable rendering, no tenant source fork.",
    "actions": [
      { "label": "Start intake", "href": "/intake", "style": "primary" }
    ]
  },
  "tokens": {
    "background": "surface",
    "accent": "brand",
    "spacing": "lg"
  },
  "metadata": {
    "anchorId": "intro",
    "analyticsId": "home.hero"
  }
}
```

Custom parity block:

```json
{
  "blockType": "mediaHero",
  "variant": "amblastShapedHero",
  "content": {
    "heading": "Professioneel stralen",
    "body": "Mobiele straaltechniek voor industrie en particulier werk.",
    "media": { "id": "amblast-hero-home", "alt": "Straalwerk op locatie" },
    "actions": [
      { "label": "Neem contact op", "href": "/contact", "style": "primary" }
    ]
  },
  "tokens": {
    "overlay": "dark",
    "height": "large",
    "shapeDivider": "angled"
  },
  "metadata": {
    "priorityMedia": true,
    "seoRole": "pageHero"
  }
}
```

Catalog metadata stays outside the page runtime shape:

```json
{
  "blockType": "hero",
  "variant": "tailwindPlusSimpleCentered",
  "source": "tailwind-plus-free",
  "licenseStatus": "operator-approved",
  "reviewStatus": "accepted",
  "notes": "Concrete SIAB renderer variant with editable content and tokens."
}
```

## Phased Implementation Plan

| Phase | Research | Implement | Review |
| --- | --- | --- | --- |
| 0 - Decision lock | Review current architecture docs, tenant parity notes, and block catalog assumptions. | Publish this decision as the routing rule for later contract and renderer work. | Confirm the decision rejects generated tenant source and fuzzy provenance-driven runtime dispatch. |
| 1 - Contract tightening | Inspect contracts, fixtures, CMS block definitions, and snapshots for source-family or analytics-driven rendering assumptions. | Ensure every page block has explicit `blockType`, `variant`, `content`, `metadata`, and allowed `tokens`; keep provenance in catalog records only. | Validate Amicare, Amblast, and generic marketing examples against the tightened shapes. |
| 2 - Catalog normalization | Inventory approved Tailwind Plus/free, Preline free, Tailblocks, HyperUI, Mamba, shadcn-style, and SIAB custom variants. | Normalize catalog records around concrete variants, editable props, token allowlists, source/license metadata, and review status. | Ensure every approved entry maps to a concrete renderer variant or is clearly unavailable/deferred. |
| 3 - Renderer alignment | Inspect `packages/site-renderer` and `apps/renderer` dispatch paths. | Render by `blockType` plus `variant` only; use analytics metadata only as attributes/events. | Test generic blocks and Amicare/Amblast custom parity blocks across desktop and mobile. |
| 4 - CMS editing surface | Inspect CMS editors/importers for editable fields, token controls, and validation gaps. | Expose content, metadata, and allowed token props; reject arbitrary source, arbitrary classes, and unapproved fields. | Verify editors create and update valid blocks without enabling tenant-specific source generation. |
| 5 - Tenant parity data | Compare Amicare and Amblast legacy snapshots against renderer output and identify required custom variants. | Encode parity as CMS/snapshot data with custom variants, media references, SEO metadata, chrome settings, and provider metadata. | Run visual, SEO, interaction, and form parity checks before any cutover. |

## Explicit Non-Goals

- No generated folders under `sites/*` for new tenants.
- No tenant-specific GitHub workflows, Docker images, or runtime branches.
- No arbitrary React/Astro/source-code output from AI generation.
- No raw upstream HTML or arbitrary Tailwind class editing in tenant data.
- No runtime dispatch based on provenance, source family, or
  `analytics.sectionVariant`.
- No broad design-system rewrite or generalized layout engine in this phase.
- No payment, DNS, domain automation, or deploy contract changes.
- No claim that legacy tenant source is the pattern for new generated sites.

## Acceptance Criteria

- Architecture docs identify a block as a concrete styled component with
  editable content, metadata, and allowed token props.
- Runtime selection is explicitly `blockType` plus `variant`.
- Provenance is allowed only as catalog/audit metadata, not as the rendering
  selector.
- Approved external block sources are treated as concrete block catalogs with
  operator-approved licensing.
- Amicare and Amblast parity is represented by custom styled blocks and
  structured tenant data.
- New generated sites remain CMS/snapshot data rendered through
  `packages/site-renderer` and `apps/renderer`.
- The decision can be implemented incrementally without changing deploy
  invariants or creating tenant-specific source.
