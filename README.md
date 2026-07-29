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

> Build is delivered module-by-module. Setup instructions and tooling are added as each
> layer lands (database → API → frontend → AI → tests → deployment).

Prerequisites: **Node ≥ 20.11**, **pnpm ≥ 9**, **Python ≥ 3.11**, **Docker**, **PostgreSQL**, **Redis**.

```bash
pnpm install            # install JS workspaces (added in a later step)
```

---

## 📈 Build roadmap

- [x] **Step 1 — Folder structure**
- [x] **Step 2 — Database schema (Prisma / PostgreSQL)** — 78 models, 52 enums, validated
- [~] **Step 4 — Backend modules** *(in progress)* — ✅ Auth · Users · RBAC · Instruments · Market-Data (live Binance) · Watchlist · Portfolio (live valuation) · Paper Trading (live-price fill engine w/ long+short) · **AI-Analysis bridge** (Node→Python, persists explainable Signals, WebSocket push — verified cross-service on live data). Initial migration (78 tables) + seed; remaining feature modules next
- [ ] Step 5 — Frontend modules
- [~] **Step 6 — AI engine** *(core delivered)* — FastAPI service with in-house TA indicators (RSI/MACD/EMA/ATR/ADX/Bollinger/VWAP/SuperTrend/Stochastic) + an **explainable** BUY/SELL/NO_TRADE/WATCH signal engine; 12 pytest tests pass, verified on live Binance candles. Node↔Python bridge wired & verified cross-service. Next: SMC/candlestick/pattern engines, ML forecasting, vision, LLM narrative
- [~] **Step 7 — Tests** *(started)* — API pure-logic unit suite (Vitest, 25 tests: fill/position math, RBAC, value objects, Result, pagination) + AI-engine pytest (12), both wired into CI; no infra required. Integration/e2e (DB-backed) next
- [~] **Step 8 — Deployment** *(core delivered)* — docker-compose (Postgres, Redis, API, AI-engine, one-shot migrate+seed) with healthchecks + ordering; multi-stage Dockerfiles; GitHub Actions CI (API typecheck/build + AI-engine pytest). Nginx/TLS + web service next
- [ ] Step 9 — Code review

---

## 📄 License

Proprietary — © DEVQUANTIC. All rights reserved.
