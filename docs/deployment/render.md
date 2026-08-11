# Deploy to Render (public link)

[`render.yaml`](../../render.yaml) is a Blueprint that provisions the whole stack:
**Postgres + Redis + API + AI engine + web SPA**. Free tiers, no card required.

> Heads-up: this template hasn't been deployed from the build environment (no
> Render account there), so treat the first deploy as a shakeout — a couple of
> cross-service URLs are filled by hand in the dashboard (below). Free services
> sleep when idle and free Postgres expires after ~90 days.

## Steps

1. **Push to GitHub** (already done): `github.com/sanu-basak/ai-trading`.
2. In Render: **New → Blueprint** → select the repo → **Apply**. Render creates
   the database, Redis, and three services from `render.yaml`.
3. **First deploy will prompt for the `sync: false` values.** Because services
   reference each other's URLs, do it in this order:

   | Service | Variable | Value |
   |---|---|---|
   | (after web is created) `devquantic-web` | `VITE_API_URL` | `https://devquantic-api.onrender.com/api/v1` |
   | `devquantic-api` | `AI_ENGINE_URL` | `https://devquantic-ai-engine.onrender.com` |
   | `devquantic-api` | `CORS_ORIGINS` | `https://devquantic-web.onrender.com` |
   | `devquantic-api` | `WEB_BASE_URL` | `https://devquantic-web.onrender.com` |
   | `devquantic-api` | `SEED_ADMIN_EMAIL` | your email |
   | `devquantic-api` | `SEED_ADMIN_PASSWORD` | a strong password |
   | `devquantic-ai-engine` | `CORS_ORIGINS` | `https://devquantic-api.onrender.com` |

   (Your actual URLs are shown in the Render dashboard — substitute them.)

4. The API's **preDeploy** runs `prisma migrate deploy` + the seed automatically
   (creates roles, plans, exchanges, and your admin user).
5. After the web static site rebuilds with `VITE_API_URL` set, open its URL and
   **register / sign in**.

## What works immediately

- Auth, watchlists, portfolio, paper trading, trade journal, alerts.
- **Crypto AI analysis** (signals, patterns, S/R, MTF, SMC, backtest) works
  out-of-the-box via Binance's public API.
- Equities/forex analysis stays `503` until you register a keyed market-data
  provider — the platform never fabricates prices.

## Gotchas

- **Free plan cold starts**: first request after idle can take ~30–60s.
- **Prisma binary**: the schema already targets `debian-openssl-3.0.x`, which
  matches Render's build image.
- If the static build can't find the API, re-check `VITE_API_URL` includes the
  `/api/v1` suffix, then trigger a manual redeploy of `devquantic-web`.

## Alternative hosts

The same shape maps to Railway/Fly.io: two web services (Docker images already
in `infra/docker/`), one static site, plus managed Postgres + Redis. The
`docker-compose.yml` is the local equivalent.
