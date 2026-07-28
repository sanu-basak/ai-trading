# API Architecture — DEVQUANTIC AI Trading Analyst

**Stack:** Node.js 20 · Express · TypeScript (strict) · Prisma · Redis · BullMQ · Socket.io ·
awilix (DI) · pino · Zod · Prometheus.

The backend follows **Clean Architecture** with **Domain-Driven Design** bounded contexts and an
**event-driven** backbone. This document describes the architectural skeleton delivered in Step 3;
feature modules (Step 4) are built *on top of* these primitives without modifying them.

> Verified: `pnpm install` → `prisma generate` → `tsc --noEmit` passes with **zero errors** under
> `strict` mode.

---

## 1. Layering & the dependency rule

```
        interface  ──►  application  ──►  domain  ◄──  infrastructure
       (controllers)   (use-cases,       (entities,     (Prisma repos,
                        CQRS handlers)    value objects,  adapters — implement
                                          domain events)  domain interfaces)
```

Dependencies point **inward**. The domain knows nothing about Express, Prisma, or Redis.
Infrastructure implements interfaces declared by the domain/application layers and is wired at the
**composition root** (`src/di/container.ts`). This keeps business logic testable in isolation and
swappable at the edges (e.g. a new market-data provider or payment gateway).

### Directory roles (`apps/api/src`)

| Path | Layer | Contents |
|---|---|---|
| `shared/domain` | Domain kernel | `Entity`, `AggregateRoot`, `ValueObject`, `UniqueEntityID`, `Result`/`Either`, `Guard`, `DomainEvent`, repository & pagination contracts |
| `shared/application` | Application kernel | CQRS `CommandBus`/`QueryBus`, `IEventBus`, `Mapper` |
| `shared/errors` | Cross-cutting | Typed `AppError` hierarchy + stable `ErrorCode`s |
| `shared/infrastructure` | Infrastructure | `config`, `logger`, `database` (Prisma + UnitOfWork), `cache` (Redis), `queue` (BullMQ), `security` (argon2/JWT/AES-GCM/RBAC), `websocket`, `monitoring` (health + metrics) |
| `market-data` | Infrastructure | Provider abstraction, registry, distributed rate-limiter, failover service |
| `middleware` | Interface | Express pipeline: context, logging, auth, RBAC, validation, rate-limit, metrics, error handling |
| `http` | Interface | Response envelope, OpenAPI registry, routes, app factory, server bootstrap |
| `di` | Composition root | awilix container wiring the whole graph |
| `modules/*` | Feature contexts | Added in Step 4 — each split into `domain / application / infrastructure / interface` |

---

## 2. Request lifecycle

```
HTTP request
  → helmet · cors · compression · body/cookie parsers          (security & parsing)
  → requestContext        (assign x-request-id, open AsyncLocalStorage scope)
  → requestLogger         (pino-http, correlated by request id)
  → httpMetrics           (Prometheus throughput + latency)
  → rate limiter          (Redis-backed, per IP / per user)
  → route handler
      → authenticate       (verify JWT access token → req.user + context)
      → authorize          (RBAC permission / role check)
      → validate           (Zod: body / query / params, typed & coerced)
      → controller         (thin) → CommandBus / QueryBus
          → use-case (application) → domain + repositories (infrastructure)
              → UnitOfWork (DB transaction) → publish domain events post-commit
      → sendOk / sendCreated / sendPage   (standard success envelope)
  → notFound (unmatched) → errorHandler (normalize → log → error envelope)
```

### Response envelopes

Success:
```json
{ "success": true, "data": { }, "meta": { }, "requestId": "…" }
```
Error (never leaks internal 5xx detail in production):
```json
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "…", "details": { } }, "requestId": "…" }
```

---

## 3. CQRS & events

- **Commands** mutate state; **Queries** read. Each is a plain class dispatched through the
  `CommandBus` / `QueryBus`, which resolve a single registered handler by class name.
- **Domain events** are raised by aggregates (`addDomainEvent`) and buffered. The **`UnitOfWork`**
  runs the mutation inside a Prisma transaction and publishes the buffered events on the
  `IEventBus` **only after commit** — guaranteeing no event fires for a rolled-back change.
- The default `InMemoryEventBus` isolates handler failures; a Redis pub/sub adapter can bridge it
  for cross-instance fan-out without changing publishers.

---

## 4. Error model

All thrown values are normalized at the boundary (`middleware/error-handler.ts`) into an
`AppError` carrying `statusCode`, a stable `ErrorCode`, optional safe `details`, and an
`isOperational` flag. Zod errors → `VALIDATION_ERROR (422)`; Prisma `P2002` → `CONFLICT (409)`,
`P2025` → `NOT_FOUND (404)`. Non-operational errors are logged at `error`, and their message/stack
are withheld from clients in production.

---

## 5. Infrastructure highlights

- **Config** — `env.ts` validates all environment variables with Zod and fails fast; `AppConfig`
  exposes a typed, structured view (parsed Redis options, CORS origins). No module reads
  `process.env` directly.
- **Security** — Argon2id password hashing, dual-secret JWT access/refresh tokens, AES-256-GCM
  authenticated encryption for at-rest secrets (broker tokens, 2FA), and pure RBAC helpers with
  wildcard permissions (`billing:*`, `*`).
- **Market data** — providers implement `IMarketDataProvider`; the `MarketDataService` layers
  **cache-aside** (per-type TTLs), **distributed token-bucket rate limiting** (atomic Redis Lua),
  and **priority-ordered failover** that skips unhealthy/limited providers and raises a typed
  `MARKET_DATA_UNAVAILABLE` only when every candidate fails. **No prices are ever synthesized.**
- **Queues** — `QueueService` centralizes BullMQ queues/workers with sane retry/backoff and a
  single Redis connection profile; queue names are enumerated in one place.
- **Observability** — `/health` aggregates dependency probes for the load balancer; `/metrics`
  exposes Prometheus metrics; every request is correlated by `x-request-id`.
- **Realtime** — the Socket.io gateway authenticates each connection with the REST access token,
  joins per-user and per-instrument rooms, and exposes typed broadcast helpers for workers.

---

## 6. Composition root (DI)

`src/di/container.ts` builds an **awilix** container with a fully-typed `Cradle`. Registrations use
explicit factories (`asFunction`) so wiring never depends on parameter-name reflection, and all
infrastructure services are process singletons. Feature modules extend this base container with
their repositories and CQRS handlers in Step 4.

## 7. Bootstrap & lifecycle

`http/server.ts` connects Postgres and Redis, registers health probes, attaches the WebSocket
gateway, starts listening, and installs **graceful shutdown** (drains the HTTP server, closes
sockets, queues, Redis, and Prisma) on `SIGTERM`/`SIGINT`, plus last-resort `uncaughtException`
handling.

---

## 8. Conventions for feature modules (Step 4+)

1. One folder per bounded context under `modules/<name>/` with `domain / application /
   infrastructure / interface`.
2. Controllers stay thin — parse/validate, dispatch a command/query, shape the response.
3. Repositories implement domain-declared interfaces using Prisma; mutations go through the
   `UnitOfWork`.
4. Register handlers, repositories, and routers by extending the DI container and mounting the
   module router in `http/routes/index.ts`.
5. Register request/response schemas with the `OpenApiRegistry` so `/docs` stays complete.
