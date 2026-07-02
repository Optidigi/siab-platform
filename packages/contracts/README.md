# @siteinabox/contracts

Shared TypeScript contracts for data exchanged between SIAB apps, packages, and
tenant site snapshots.

## Ownership

- Put cross-package data shapes here when more than one app/package must agree
  on the same payload.
- Keep runtime rendering behavior out of this package. Shared CMS/public site
  rendering belongs in `packages/site-renderer`.
- Site generation contracts should describe validated tenant, site, page,
  theme, SEO, and published snapshot data. They must not describe generated
  source files, per-client folders, workflows, or containers.
- Prefer additive changes and explicit optional fields for compatibility across
  CMS, current tenant snapshot consumers, and renderer consumers.

## Current Contracts

- `rich-text`: structured rich text nodes used by CMS content and tenant site
  snapshots.
- `site`: tenant site page blocks, projections, media refs, navigation, and
  site settings.
- `generation`: intake normalization, site generation specs, token theme specs,
  block manifests, published snapshots, and validation/apply result contracts.
- `deploy-targets`: canonical renderer-owned production hosts and deploy target
  metadata used by renderer routing, compose/workflow checks, and smoke gates.

## Validation

This package is type-first for authoring contracts and also owns the shared Zod
runtime schemas used where platform boundaries need contract validation. CMS,
renderer, and service boundaries should validate untrusted structured data with
the exported runtime schemas instead of accepting arbitrary source, component, or
HTML payloads.

## Checks

```bash
pnpm --dir packages/contracts typecheck
```
