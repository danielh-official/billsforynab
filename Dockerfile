# Base: Bun (Node-compatible runtime, matches CI)
FROM oven/bun:1 AS base
WORKDIR /app

# deps: install dependencies for cache
FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# dev: run dev server (source mounted at runtime)
FROM base AS dev
COPY --from=deps /app/node_modules ./node_modules
COPY scripts/docker-dev-entrypoint.sh /docker-dev-entrypoint.sh
RUN chmod +x /docker-dev-entrypoint.sh
COPY . .
EXPOSE 5173
ENTRYPOINT ["/docker-dev-entrypoint.sh"]
CMD ["bun", "run", "dev"]

# builder: produce static build
FROM deps AS builder
COPY . .
ARG PUBLIC_ADAPTER=static
ARG PUBLIC_YNAB_CLIENT_ID=
ENV PUBLIC_ADAPTER=$PUBLIC_ADAPTER
ENV PUBLIC_YNAB_CLIENT_ID=$PUBLIC_YNAB_CLIENT_ID
RUN bun run build

# preview: serve built app (production-like)
FROM builder AS preview
EXPOSE 4173
CMD ["bun", "run", "preview", "--", "--host", "0.0.0.0"]

# e2e: Playwright + app deps; runs tests against preview service (BASE_URL set at runtime)
FROM mcr.microsoft.com/playwright:v1.49.0-noble AS e2e
WORKDIR /app
RUN apt-get update && apt-get install -y unzip && rm -rf /var/lib/apt/lists/* && \
    curl -fsSL https://bun.sh/install | bash && \
    ln -s /root/.bun/bin/bun /usr/local/bin/bun
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
CMD ["bun", "run", "test:e2e"]
