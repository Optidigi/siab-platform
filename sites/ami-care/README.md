# Ami-care Tenant Site

One-pager for Amicare-Zorg. Static site, deployed to https://ami-care.nl
via Coolify (Docker, Traefik) on the Optidigi VPS.

## Local development

```bash
pnpm install
pnpm dev          # http://localhost:4321
pnpm build        # → dist/
pnpm preview      # serves dist/ for sanity check
pnpm og           # regenerate public/og.png
```

## Deploy

Push to `main`. The root GitHub Actions workflow
`.github/workflows/build-tenant-amicare-image.yml` builds
the Docker image and pushes it to
`ghcr.io/optidigi/siteinabox-site-ami-care:latest`.

On the VPS (`/srv/saas/infra/stacks/siteinabox/tenants/ami-care/`):

```bash
cd /srv/saas/infra/stacks/siteinabox/tenants/ami-care
docker compose pull
docker compose up -d
```

Public traffic is routed by the shared Traefik edge. The production compose
joins the external `proxy` docker network and declares the public
`ami-care.nl` route with Traefik labels.

## Design

The imported design/spec history is not present in this monorepo. Use the
current site source, `src/content/`, and
[`docs/responsive-canvas-contract.md`](docs/responsive-canvas-contract.md) as
the local references.

## CMS editor CSS bundling

For the siab-payload canvas editor, this site exposes a bundled stylesheet:

- **Production**: `pnpm build` runs `astro build && node scripts/build-cms-css.mjs`,
  producing `dist/cms/cms-editor.css` that the CMS reads from
  `<DATA_DIR>/tenants/<id>/cms-editor.css`. Keep the tenant data artifact in
  sync through the CMS/runtime deployment path before restarting the site
  container.

- **Local dev**: run `pnpm dev:cms-css` alongside `pnpm dev` to watch
  `src/styles/{global,rich-text}.css` and concatenate them into
  `../siab-payload/.data-out/tenants/<TENANT_ID>/cms-editor.css` for the CMS
  to consume live.

## CMS-backed mode

Editorial content lives in the Payload tenant volume (`/data/`). Editor changes
in Payload admin flow through normally: JSON is re-projected on save, and the
next request reads fresh data.

### Runtime details (post-conversion)

This site reads editorial content from a per-tenant Payload CMS data directory mounted into the container at `/data`. Editor changes are visible on the next request — there is no rebuild on content edits.

**Required runtime env:**

- `CMS_DATA_DIR` — defaults to `/data`. Where the per-tenant data is mounted.
- `SITE_URL` — public site URL (e.g. `https://ami-care.nl`).

**Required volume:**

- Mount the per-tenant data dir at `/data:ro`. See `docker-compose.cms.yml.example`.
- Do not mount `/data` read-write for CSS sync.

**Editor:**

The Payload tenant has an editor user; the operator manages account access.

**Failure modes:**

If `/data` is not mounted, or any page JSON is missing/malformed, the site renders with empty editorial fields. Pages always return 200; `/healthz` returns 200 unconditionally for container healthchecks.
