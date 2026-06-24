# SIAB CMS

Multi-tenant Payload v3 + custom shadcn admin powering the siteinabox ecosystem.

For operating rules, start with [AGENTS.md](AGENTS.md). For implementation
history and active follow-up context, use the backlog indexes under
[docs/backlog/](docs/backlog/) and the runbooks under
[docs/runbooks/](docs/runbooks/).

## Local development

See [docs/runbooks/local-dev.md](docs/runbooks/local-dev.md) for the full local setup. Docker Compose is the cross-platform default; Shimmy's Linux dev box uses the documented Podman commands instead.

Quick start:

```bash
git clone https://github.com/Optidigi/siteinabox.git
cd siteinabox/apps/cms
pnpm install
docker compose -f docker-compose.local.yml up -d
cp .env.example .env   # edit PAYLOAD_SECRET
pnpm dev
```

Visit http://localhost:3000/admin to create the first user.

## Hosts file (for multi-host testing)

Tenant subdomains are routed via host-based middleware (Phase 3, shipped). To exercise the multi-tenant flows locally, add to `C:\Windows\System32\drivers\etc\hosts` (Windows, run editor as admin) or `/etc/hosts`:

```
127.0.0.1 admin.localhost
127.0.0.1 admin.t1.test
127.0.0.1 admin.t2.test
```
