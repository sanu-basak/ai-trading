<div align="center">

# 📊 DEVQUANTIC AI TRADING ANALYST

**An AI-powered trading *analysis* platform that helps traders make informed decisions.**

Signals are explained, never guaranteed. The platform performs analysis and education only —
it is **not** investment advice and makes **no promise of profit**.

</div>

---

## ⚠️ Disclaimer

DEVQUANTIC is an analytical and educational tool. It produces `BUY` / `SELL` / `NO TRADE` /
`WATCH` assessments with a confidence score and a full written rationale. It does **not**
execute trades on your behalf, does **not** guarantee outcomes, and is **not** a substitute
for a licensed financial advisor. Trading involves substantial risk of loss.

---

## 🏛️ Architecture at a glance

A pnpm + Turbo monorepo composed of three deployable applications and shared packages,
built on Clean Architecture, Domain-Driven Design, and an event-driven backbone.

```
┌──────────────┐     REST / WebSocket      ┌──────────────┐     REST / gRPC      ┌───────────────┐
│  apps/web    │  ───────────────────────► │  apps/api    │  ──────────────────► │ apps/ai-engine│
│ React 19 SPA │  ◄─────────────────────── │ Node/Express │  ◄────────────────── │ Python FastAPI│
│  Vite + TS   │      Socket.io feed       │ Prisma + DDD │    analysis results  │  ML / LLM / TA │
└──────────────┘                           └──────┬───────┘                      └───────┬───────┘
                                                  │                                      │
                              ┌───────────────────┼───────────────────┐          ┌───────┴───────┐
                              ▼                    ▼                   ▼          ▼               ▼
                        PostgreSQL              Redis             BullMQ     Model Registry   LLM APIs
                        (Prisma ORM)         (cache/pubsub)      (workers)   (XGB/LGBM/TF)  (Claude/OpenAI)
```

### Applications

| App | Stack | Responsibility |
|-----|-------|----------------|
| [`apps/web`](apps/web) | React 19, Vite, TypeScript, Tailwind, ShadCN, Framer Motion, TanStack Query, Zustand, RHF, TradingView | User-facing SPA — dashboards, scanners, charts, journal, AI chat |
| [`apps/api`](apps/api) | Node.js, Express, TypeScript, Prisma, Redis, BullMQ, Socket.io | Business logic, auth, billing, market-data gateway, orchestration |
| [`apps/ai-engine`](apps/ai-engine) | Python, FastAPI, Pandas, NumPy, scikit-learn, TensorFlow, PyTorch, XGBoost, LightGBM, Prophet, TA-Lib | Technical analysis, pattern & SMC detection, ML inference, vision, news sentiment, LLM reasoning |

### Shared packages

| Package | Purpose |
|---------|---------|
| [`packages/shared-types`](packages/shared-types) | Cross-app TypeScript contracts (DTOs, enums, signal schema) |
| [`packages/config`](packages/config) | Shared tsconfig / eslint / prettier presets |
| [`packages/utils`](packages/utils) | Framework-agnostic utilities |
| [`packages/logger`](packages/logger) | Structured logging helpers |

---

## 📦 Supported markets

`NSE` · `BSE` · `Crypto` · `Forex` · `US Stocks` · `Commodities` · `Options` · `Futures`

## 🧩 Core modules

Authentication · Authorization · Dashboard · Watchlist · Scanner · Portfolio · Trade Journal ·
Paper Trading · Backtesting · AI Analysis · Market / Options / News / Smart-Money Scanners ·
Portfolio AI · Strategy Builder · Risk Management · Notifications · Subscription · Billing ·
Admin · Settings · User Management · API Management · AI Chat · Chart Analysis · Broker Integration

---

## 🗂️ Repository layout

See [`docs/architecture/STRUCTURE.md`](docs/architecture/STRUCTURE.md) for the full annotated tree.

```
.
├── apps/
│   ├── web/          # React 19 frontend (feature-sliced)
│   ├── api/          # Express backend (DDD bounded contexts)
│   └── ai-engine/    # FastAPI AI/ML service
├── packages/         # shared libraries
├── infra/            # docker, nginx, monitoring, CI scripts
├── docs/             # architecture, API, deployment, ADRs, runbooks
└── .github/          # GitHub Actions workflows
```

---

## 🚀 Getting started

Prerequisites: **Node ≥ 20.11**, **pnpm ≥ 9**, **Python ≥ 3.11**, plus **PostgreSQL** and **Redis**
(local installs, Docker, or free hosted — Neon + Upstash work with zero local infra).

### Option A — Docker (whole stack, one command)

```bash
cp infra/env/docker.env.example .env    # then edit secrets
docker compose up --build
# API :4000 · AI engine :8000 · Postgres :5432 · Redis :6379
```

### Option B — Run locally without Docker

```bash
# 1) API  (point apps/api/.env at your Postgres + Redis — see apps/api/.env.example)
cd apps/api && pnpm install
npx prisma migrate deploy && pnpm db:seed && pnpm dev        # http://localhost:4000

# 2) AI engine
cd apps/ai-engine && python -m venv .venv
./.venv/Scripts/pip install -r requirements.txt              # (Unix: .venv/bin/pip)
./.venv/Scripts/uvicorn app.main:app --port 8000             # http://localhost:8000

# 3) Web
cd apps/web && cp .env.example .env && pnpm dev              # http://localhost:5173
```

Crypto AI analysis works out of the box (Binance, no key). Equities/forex need a keyed
market-data provider; **AI Chat** needs `ANTHROPIC_API_KEY`; **payments** need Razorpay keys —
each degrades to a clear "not configured" message rather than breaking.

### Deploy a public URL

Push to GitHub and use the included [`render.yaml`](render.yaml) blueprint — see
[docs/deployment/render.md](docs/deployment/render.md).

---

## 📈 Build roadmap

- [x] **Step 1 — Folder structure**
- [x] **Step 2 — Database schema (Prisma / PostgreSQL)** — 78 models, 52 enums, validated
- [~] **Step 4 — Backend modules** *(in progress)* — ✅ Auth · Users · RBAC · Instruments · Market-Data (live Binance) · Watchlist · Portfolio (live valuation) · Paper Trading (live-price fill engine w/ long+short) · **AI-Analysis bridge** (Node→Python, persists explainable Signals, WebSocket push — verified cross-service on live data). Initial migration (78 tables) + seed; remaining feature modules next
- [~] **Step 5 — Frontend** *(core delivered)* — React 19 + Vite + TS + Tailwind SPA: auth (login/register + token refresh), app shell, instruments search, **AI Analyze** (explainable signal card), watchlists, paper trading. TanStack Query + Zustand; builds clean (`tsc` + `vite build`)
- [~] **Step 6 — AI engine** *(core delivered)* — FastAPI service with in-house TA indicators (RSI/MACD/EMA/ATR/ADX/Bollinger/VWAP/SuperTrend/Stochastic) + an **explainable** BUY/SELL/NO_TRADE/WATCH signal engine, **candlestick pattern detection** (12 patterns) and **support/resistance level detection**, and **multi-timeframe confluence** (weighted composite across timeframes w/ alignment detection, `POST /analysis/analyze-mtf`); 27 pytest tests pass, verified on live Binance candles. Node↔Python bridge wired (patterns + levels persisted end-to-end). Next: ML forecasting, vision, LLM narrative, + Node/UI wiring for MTF
- [~] **Step 7 — Tests** *(started)* — API pure-logic unit suite (Vitest, 25 tests: fill/position math, RBAC, value objects, Result, pagination) + AI-engine pytest (12), both wired into CI; no infra required. Integration/e2e (DB-backed) next
- [~] **Step 8 — Deployment** *(core delivered)* — docker-compose (Postgres, Redis, API, AI-engine, one-shot migrate+seed) with healthchecks + ordering; multi-stage Dockerfiles; GitHub Actions CI (API typecheck/build + AI-engine pytest). Nginx/TLS + web service next
- [ ] Step 9 — Code review

---

## 📄 License

Proprietary — © DEVQUANTIC. All rights reserved.
