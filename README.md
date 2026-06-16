# siab-platform

Monorepo shell for the SIAB platform.

## Layout

```txt
apps/
  cms/              # Payload CMS app, formerly siab-payload
  site/             # public siteinabox.nl site, formerly site-siteinabox

packages/
  site-template/    # generated-site baseline, formerly siab-site-template
  site-themes/      # generated-site themes, formerly siab-site-themes
  tools/
    siab-orchestrator/
      commands/     # /new-site and /add-cms command contracts
      workflows/    # separate sitegen and CMS conversion workflows
      scripts/      # CMS conversion helpers
      runbooks/
```

## Deployment Contract

The first monorepo migration preserves production behavior:

- `apps/cms` still publishes `ghcr.io/optidigi/siab-payload:latest`.
- `apps/site` still publishes `ghcr.io/optidigi/site-siteinabox:latest`.
- Existing generated/client sites remain separate repos/images for now.
- Existing VPS stack paths and tenant data paths are not moved in this step.
- Traefik remains the edge proxy; routing stays compose-label based.

## Useful Checks

```bash
pnpm cms:typecheck
pnpm cms:test
pnpm site:build
pnpm template:build
pnpm orchestrator:test
```
