# SIAB Platform Infra

This directory is the future source-of-truth location for deploy stack files.
The first monorepo migration does not change live VPS paths or tenant data
paths.

Current production still uses the existing stack directories:

- `/srv/saas/infra/stacks/siab-payload/compose.yml`
- `/srv/prod/infra/stacks/siteinabox/docker-compose.yml`
- `/srv/prod/infra/stacks/amblast/compose.yml`
- `/srv/prod/infra/stacks/ami-care/compose.yml`

The preferred future stack namespace is:

```txt
/srv/saas/infra/stacks/siab-platform/
  cms/
  apps/
    site/
    intake/
  tenants/
    amblast/
    ami-care/
```

Important invariant: Payload tenant data remains under
`/srv/data/saas/siab-payload/tenants/<tenantId>`. Stack-file organization may
move later, but CMS projection data, artifact sync, backups, and generated-site
mounts must not move as part of this repo migration.

Traefik is the production edge proxy. Compose stacks should route through labels
on the shared external `proxy` network.

