# Stage 10 — HF Space frontend Dockerfile.
#
# Mirrors frontend/Dockerfile but builds from the repo root so we can
# bake NEXT_PUBLIC_API_BASE into the static export at build time.

FROM node:20-alpine AS deps
WORKDIR /app
COPY frontend/package.json ./
RUN npm install --no-audit --no-fund

FROM node:20-alpine AS builder
ARG NEXT_PUBLIC_API_BASE
ENV NEXT_PUBLIC_API_BASE=${NEXT_PUBLIC_API_BASE}
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY frontend/ ./
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup -S app && adduser -S app -G app

COPY --from=builder /app/public ./public
COPY --from=builder --chown=app:app /app/.next/standalone ./
COPY --from=builder --chown=app:app /app/.next/static ./.next/static

USER app
EXPOSE 3000
CMD ["node", "server.js"]
