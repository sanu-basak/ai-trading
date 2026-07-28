# syntax=docker/dockerfile:1
# ---------------------------------------------------------------------------
# DEVQUANTIC API — multi-stage build.
# The api package is installed standalone (--ignore-workspace) so the image has
# a normal, self-contained node_modules with no workspace symlinks. Build context
# is the repo root.
# ---------------------------------------------------------------------------

FROM node:20-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable
# OpenSSL is required by Prisma's query engine on debian-based images.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# ---- Build stage: full deps, generate client, compile TypeScript ----
FROM base AS build
COPY apps/api/package.json ./package.json
RUN --mount=type=cache,target=/pnpm/store pnpm install --ignore-workspace
COPY apps/api/ ./
RUN pnpm exec prisma generate
RUN pnpm run build

# ---- Prod deps stage: production-only node_modules ----
FROM base AS proddeps
COPY apps/api/package.json ./package.json
RUN --mount=type=cache,target=/pnpm/store pnpm install --ignore-workspace --prod

# ---- Runtime stage ----
FROM node:20-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
WORKDIR /app
COPY apps/api/package.json ./package.json
COPY --from=proddeps /app/node_modules ./node_modules
# Overlay the generated Prisma client (generated content, not a plain package).
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
EXPOSE 4000
USER node
CMD ["node", "dist/main.js"]
