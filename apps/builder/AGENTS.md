# AGENTS.md

Builder-specific operating rules for `apps/builder`.

## Scope

`apps/builder` is the client-facing Builder app for future intake, internal
generator orchestration, authenticated preview, approval, payment handoff, and
publish trigger work. This skeleton only proves the app can render with shared
SIAB UI. Do not add product workflow logic unless the current task explicitly
authorizes it.

## UI Boundary

- Use shared primitives and reusable app-neutral components from
  `@siteinabox/ui`.
- Import component subpaths explicitly, for example
  `@siteinabox/ui/components/button`.
- Import shared tokens through `@siteinabox/ui/styles/shadcn.css`.
- Do not import from `apps/cms/src/...` or copy CMS component source into
  Builder.
- If a CMS component becomes genuinely reusable, extract the app-neutral version
  into `packages/ui` and keep app-specific behavior in the owning app.
- Do not create a second Builder-only design system. Use the shared tokens and
  Tailwind utilities already exposed by `packages/ui`.

## Current Non-Goals

- No intake workflow.
- No generator run logic.
- No AI provider integration.
- No preview renderer.
- No auth, Payload, payment provider, or publish logic.

## Checks

Run these after Builder TypeScript or UI changes:

```bash
pnpm --dir apps/builder typecheck
pnpm --dir apps/builder build
```
