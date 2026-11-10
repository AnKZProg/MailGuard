# MailGuard as a container: same app, same port, the database in a Docker
# volume. See README § Docker. Build: `docker compose build`.

ARG NODE_VERSION=24

# --- Dependencies (all of them: the build needs Tailwind, TypeScript…) -------
FROM node:${NODE_VERSION}-bookworm-slim AS deps
WORKDIR /app
# .npmrc pins npm scripts to the Windows Git Bash used by Lancer-MailGuard.bat;
# inside Linux they must run with the regular shell.
ENV npm_config_script_shell=/bin/sh
# Toolchain only in case better-sqlite3 has no prebuilt binary for this Node.
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ \
 && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json .npmrc prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci

# --- Build -------------------------------------------------------------------
FROM deps AS build
COPY . .
# Placeholders so the env schema validates and pages can be prerendered against
# an empty throwaway schema. Not secrets, never used to reach a provider, and
# they stay in this stage — the runtime image gets the real ones from compose.
ENV NEXT_TELEMETRY_DISABLED=1 \
    CHECKPOINT_DISABLE=1 \
    DATABASE_URL=file:/tmp/build.db \
    MAILGUARD_ENCRYPTION_KEY=YnVpbGQtb25seS1wbGFjZWhvbGRlci1rZXktMzJieXQ= \
    GOOGLE_CLIENT_ID=build-placeholder \
    GOOGLE_CLIENT_SECRET=build-placeholder \
    MICROSOFT_CLIENT_ID=build-placeholder \
    MICROSOFT_CLIENT_SECRET=build-placeholder
RUN node_modules/.bin/prisma db push \
 && npm run build \
 && npm prune --omit=dev

# --- Runtime -----------------------------------------------------------------
FROM node:${NODE_VERSION}-bookworm-slim AS runtime
WORKDIR /app
# Prisma's CLI detects the OpenSSL version to pick its engine; without it, it
# falls back to a guess and tries to write engines into node_modules at startup.
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl \
 && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    CHECKPOINT_DISABLE=1 \
    PRISMA_HIDE_UPDATE_MESSAGE=1 \
    TZ=Europe/Paris \
    DATABASE_URL=file:./data/mailguard.db \
    APP_URL=http://127.0.0.1:3000
# App files stay owned by root: the server process (user `node`) can read its
# code but not modify it. Only data/ and Next's cache are writable.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/package.json /app/next.config.ts /app/prisma.config.ts ./
COPY --from=build /app/prisma ./prisma
RUN mkdir -p data/backups .next/cache \
 && chown -R node:node data .next/cache
USER node
EXPOSE 3000
# Schema first (creates the database on first start, adds new columns after an
# update; refuses destructive changes rather than dropping data), then the server.
# Listens on 0.0.0.0 inside the container — compose publishes it on 127.0.0.1 only.
CMD ["sh", "-c", "node_modules/.bin/prisma db push && exec node_modules/.bin/next start -H 0.0.0.0 -p 3000"]
