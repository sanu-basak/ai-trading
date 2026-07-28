# Repository Structure — DEVQUANTIC AI Trading Analyst

This document is the canonical map of the monorepo. It is kept in sync with the tree as
each build step lands. Conventions:

- **Monorepo** managed with **pnpm workspaces** (+ Turbo for task orchestration, added in Step 3/8).
- **Feature-Sliced** frontend (`apps/web`).
- **Clean Architecture / DDD** backend (`apps/api`) — every bounded context is split into
  `domain → application → infrastructure → interface` layers with strict inward-only dependencies.
- **Layered AI service** (`apps/ai-engine`) — deterministic analytical engines, ML models,
  vision, news, and LLM orchestration behind a versioned FastAPI surface.

```
ai_trading/
├── apps/
│   ├── web/                         # React 19 + Vite + TypeScript SPA
│   │   ├── public/                  # static assets served as-is
│   │   └── src/
│   │       ├── app/                 # application shell
│   │       │   ├── providers/       #   React context providers (query, theme, auth, ws)
│   │       │   ├── router/          #   route definitions & guards
│   │       │   └── layouts/         #   shell layouts (app, auth, admin)
│   │       ├── features/            # feature slices (one folder per module)
│   │       │   └── <feature>/
│   │       │       ├── components/  #   feature-scoped React components
│   │       │       ├── hooks/       #   feature-scoped hooks
│   │       │       ├── api/         #   TanStack Query hooks + API clients
│   │       │       ├── stores/      #   Zustand stores
│   │       │       └── types/       #   feature-local types
│   │       ├── components/          # cross-feature UI
│   │       │   ├── ui/              #   ShadCN primitives
│   │       │   ├── charts/          #   TradingView & chart wrappers
│   │       │   ├── layout/          #   shared layout pieces
│   │       │   └── common/          #   misc shared components
│   │       ├── hooks/               # global hooks
│   │       ├── lib/                 # framework glue
│   │       │   ├── api/             #   axios/fetch client, interceptors
│   │       │   ├── ws/              #   socket.io client
│   │       │   └── utils/           #   helpers
│   │       ├── stores/              # global Zustand stores
│   │       ├── types/               # global TS types
│   │       ├── styles/              # Tailwind layers, tokens
│   │       ├── config/             # runtime config, env access
│   │       └── assets/             # imported images, fonts, icons
│   │
│   ├── api/                         # Node.js + Express + TypeScript backend
│   │   ├── prisma/                  # Prisma schema, migrations, seeds
│   │   │   ├── migrations/
│   │   │   └── seeds/
│   │   └── src/
│   │       ├── modules/             # bounded contexts (DDD)
│   │       │   └── <module>/
│   │       │       ├── domain/         # entities, value objects, domain events, repo interfaces
│   │       │       ├── application/    # use-cases, services, DTOs, CQRS commands/queries
│   │       │       ├── infrastructure/ # Prisma repositories, mappers, external adapters
│   │       │       └── interface/      # controllers, routes, request validators, presenters
│   │       ├── shared/              # cross-cutting building blocks
│   │       │   ├── domain/          #   base Entity, AggregateRoot, Result, DomainEvent
│   │       │   ├── application/     #   base use-case, mediator/CQRS bus
│   │       │   ├── errors/          #   typed error hierarchy
│   │       │   └── infrastructure/
│   │       │       ├── database/    #     Prisma client, unit-of-work
│   │       │       ├── cache/       #     Redis client & cache abstractions
│   │       │       ├── queue/       #     BullMQ setup
│   │       │       ├── websocket/   #     Socket.io gateway
│   │       │       ├── logger/      #     structured (pino) logger
│   │       │       ├── config/      #     env schema & typed config
│   │       │       ├── security/    #     JWT, hashing, encryption, RBAC helpers
│   │       │       ├── monitoring/  #     metrics, health, tracing
│   │       │       ├── email/       #     transactional email adapter
│   │       │       └── telegram/    #     Telegram bot adapter
│   │       ├── market-data/         # provider abstraction layer
│   │       │   ├── abstractions/    #   provider interface, DTOs
│   │       │   ├── providers/       #   concrete providers (NSE/BSE/crypto/forex/…)
│   │       │   ├── failover/        #   routing, health, auto-failover
│   │       │   └── cache/           #   quote/candle caching
│   │       ├── workers/             # BullMQ background processors
│   │       ├── events/              # event bus & domain-event handlers
│   │       ├── middleware/          # express middleware (auth, rate-limit, error)
│   │       ├── di/                  # dependency-injection container
│   │       └── http/                # express app bootstrap
│   │           └── routes/          #   route aggregation
│   │
│   └── ai-engine/                   # Python + FastAPI AI/ML service
│       └── app/
│           ├── api/v1/              # versioned HTTP surface
│           │   ├── routes/          #   FastAPI routers
│           │   └── schemas/         #   Pydantic request/response models
│           ├── core/                # config, logging, security, DI
│           ├── domain/              # analysis domain models (signal, regime, levels)
│           ├── services/            # orchestration services
│           ├── engines/             # deterministic analytical engines
│           │   ├── technical/       #   RSI, MACD, EMA/SMA, VWAP, ADX, Ichimoku, BB, SuperTrend, ATR…
│           │   ├── patterns/        #   candlestick + chart pattern recognition
│           │   ├── smart_money/     #   order blocks, FVG, liquidity, BOS/CHOCH, premium/discount
│           │   ├── price_action/    #   trendlines, channels, triangles, flags, H&S, tops/bottoms…
│           │   ├── options/         #   OI, PCR, max pain, IV/IV-rank/percentile, build-ups
│           │   ├── multi_timeframe/ #   MTF confluence (1m → monthly)
│           │   ├── regime/          #   market-regime classification
│           │   └── risk/            #   position sizing, R:R, expected value
│           ├── ml/                  # machine-learning subsystem
│           │   ├── models/          #   XGBoost, LightGBM, TF, PyTorch, Prophet wrappers
│           │   ├── features/        #   feature engineering pipelines
│           │   ├── training/        #   training scripts & configs
│           │   ├── inference/       #   inference services
│           │   └── registry/        #   model registry & versioning
│           ├── vision/              # chart-screenshot analysis (upload → detections)
│           ├── news/                # ingestion + sentiment + impact scoring
│           ├── llm/                 # Claude/OpenAI orchestration & prompt templates
│           ├── data/providers/      # market-data adapters for the AI service
│           ├── workers/             # async/scheduled jobs
│           └── utils/               # helpers
│       ├── models_store/            # persisted trained-model artifacts (git-ignored)
│       ├── notebooks/               # research notebooks
│       └── tests/                   # unit + integration
│
├── packages/                        # shared workspace libraries
│   ├── shared-types/                # cross-app TS contracts (signal schema, DTOs, enums)
│   ├── config/                      # shared tsconfig/eslint/prettier presets
│   ├── utils/                       # framework-agnostic utilities
│   └── logger/                      # shared logging helpers
│
├── infra/                           # deployment & ops
│   ├── docker/                      # per-service Dockerfiles
│   │   ├── web/  api/  ai-engine/  nginx/
│   ├── nginx/                       # reverse-proxy config & TLS
│   │   ├── conf.d/
│   │   └── ssl/
│   ├── monitoring/                  # observability stack
│   │   ├── prometheus/
│   │   └── grafana/{dashboards,provisioning}/
│   ├── env/                         # environment templates
│   └── scripts/                     # bootstrap / migration / deploy scripts
│
├── docs/                            # documentation
│   ├── architecture/                # architecture docs + ADRs (this file lives here)
│   │   └── adr/
│   ├── api/                         # API reference / Swagger output
│   ├── deployment/                  # deployment & ops guides
│   ├── diagrams/                    # exported diagrams
│   └── runbooks/                    # incident & operational runbooks
│
├── .github/workflows/               # CI/CD (GitHub Actions)
├── pnpm-workspace.yaml
├── .editorconfig · .gitignore · .nvmrc
└── README.md
```

## Dependency rules (enforced conceptually; linting added in Step 3)

1. **Backend layers** depend inward only: `interface → application → domain`;
   `infrastructure` implements `domain` interfaces and is wired at the composition root (`di/`).
2. **Frontend features** never import from each other's internals — only via shared
   `components/`, `lib/`, `stores/`, or `packages/shared-types`.
3. **`apps/web` and `apps/api`** share types **only** through `packages/shared-types`.
4. **`apps/api`** talks to **`apps/ai-engine`** over its versioned HTTP contract, never by
   reaching into its internals.
5. Secrets and provider keys live only in environment configuration — never in source.
