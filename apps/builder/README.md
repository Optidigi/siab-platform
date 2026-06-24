# SIAB Builder

Minimal Next App Router shell for the future client-facing Builder workflow.

This app currently exists to prove Builder can consume the shared SIAB design
language from `@siteinabox/ui`. It is not a product workflow implementation.

Expected responsibilities:

- intake form for normalized domain and project data,
- internal generator orchestration,
- authenticated preview at `https://preview.siteinabox.nl/<slug>/`,
- client approval,
- payment handoff through a future payment provider adapter,
- publish trigger and deployment metadata handoff.

## UI Rules

- Import shared UI from `@siteinabox/ui` package exports.
- Import shared tokens through `@siteinabox/ui/styles/shadcn.css`.
- Do not import from `apps/cms/src/...`.
- Do not duplicate CMS components manually. Extract app-neutral reusable UI into
  `packages/ui` only when there is a real reuse need.
- Do not create a separate Builder design system.

The canonical architecture decision is
`docs/decisions/builder-platform.md`.
