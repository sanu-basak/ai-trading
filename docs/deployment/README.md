# Deployment Guide — DEVQUANTIC AI Trading Analyst

## Stack

`docker compose` brings up the full backend stack:

| Service | Image / build | Port | Purpose |
|---|---|---|---|
| `postgres` | postgres:16-alpine | 5432 | Primary database |
| `redis` | redis:7-alpine | 6379 | Cache, pub/sub, BullMQ |
| `ai-engine` | [`infra/docker/ai-engine`](../../infra/docker/ai-engine/Dockerfile) | 8000 | Python FastAPI analysis service |
| `migrate` | api `build` target | — | One-shot: `prisma migrate deploy` + seed, then exits |
| `api` | [`infra/docker/api`](../../infra/docker/api/Dockerfile) | 4000 | Node/Express API |

Startup ordering is enforced with healthchecks: `api` waits for Postgres + Redis
to be healthy, for `migrate` to complete successfully, and for `ai-engine` to start.

## Quick start

```bash
cp infra/env/docker.env.example .env   # then edit secrets
docker compose up --build
```

- API: <http://localhost:4000> · Swagger: <http://localhost:4000/docs> · Health: <http://localhost:4000/health>
- AI engine: <http://localhost:8000/docs>

The seed creates a super-admin from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`.

## Production notes

- **Secrets**: the compose defaults are for local dev only. Override
  `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `ENCRYPTION_KEY`, DB and admin
  passwords via the root `.env` (git-ignored) or your orchestrator's secret store.
- **TLS / reverse proxy**: front the API and AI engine with Nginx
  (`infra/nginx/`) terminating TLS; do not expose Postgres/Redis publicly.
- **Migrations**: the `migrate` service runs `prisma migrate deploy` (forward-only,
  no dev auto-generation). Review new migrations before deploying.
- **Images**: the API image installs the api package standalone
  (`--ignore-workspace`) for a self-contained `node_modules`, overlays the
  generated Prisma client, and runs as the non-root `node` user. Prisma's
  binary targets include `debian-openssl-3.0.x` for the slim base image.
- **Scaling**: `api` is stateless (sessions live in Postgres, cache/queues in
  Redis) and can be replicated behind the proxy. `ai-engine` is likewise stateless.

## CI

[`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) runs on every push/PR:

- **api**: `pnpm install --frozen-lockfile` → `prisma generate` → `prisma validate`
  → `tsc` typecheck → build.
- **ai-engine**: install requirements → `pytest`.

## Not yet included (future steps)

- `web` (React) service + Nginx TLS config in compose.
- Background worker service (BullMQ processors) as a separate container.
- Monitoring stack (Prometheus/Grafana) under `infra/monitoring/`.
