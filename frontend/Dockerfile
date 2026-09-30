# Stage 1: Dependencies
# Node 22 LTS와 Alpine 3.24를 유지하고 세 스테이지에 같은 태그·다이제스트를 쓴다.
# 2026-09-28 registry-1.docker.io의 library/node:22-alpine3.24 manifest list를 실조회했다.
# 실제 이미지 내용은 다이제스트가 결정하므로 갱신할 때 태그와 다이제스트를 함께 확인한다.
FROM node:26-alpine3.24@sha256:0b36e8c136b94cd4fcf02188228e76c31ad5872eef3fec8cbd2eee500cfd9e80 AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
# [W0-11] CI(ci.yml)와 동일한 pnpm --frozen-lockfile 로 통일한다.
#   종전의 `npm install` 은 frontend 에 package-lock.json 이 없어 캐럿 범위(next ^16.2.4 등)를
#   매 빌드 새로 해석했다. 그 결과 **CI 가 검증한 의존성 트리와 배포 이미지의 트리가 서로 달랐다** —
#   테스트를 통과한 것과 배포되는 것이 같다는 보장이 없었다.
#   --frozen-lockfile 은 lock 과 package.json 이 어긋나면 빌드를 실패시킨다(의도된 게이트).
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Stage 2: Builder
FROM node:26-alpine3.24@sha256:0b36e8c136b94cd4fcf02188228e76c31ad5872eef3fec8cbd2eee500cfd9e80 AS builder
WORKDIR /app
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
# pnpm 의 기본 node-linker=isolated 는 node_modules/* 가 node_modules/.pnpm/* 를 가리키는 상대 심볼릭
# 링크다. 링크 타깃이 복사 트리 안에 있어 스테이지 간 통째 복사로 해소되지만, 만약 런타임에
# 모듈 해석이 깨지면 `pnpm install --frozen-lockfile --config.node-linker=hoisted` 로 평탄 트리를 쓸 것.
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Next.js 15 optimization: Skip lint and type check if already done in CI
ENV NEXT_TELEMETRY_DISABLED=1
ARG BACKEND_API_URL
ARG NEXT_PUBLIC_API_URL
# FRONTEND_API_BUILD_URL_VALIDATION
RUN node scripts/validate-api-build-urls.mjs
ENV BACKEND_API_URL=$BACKEND_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_DOCKER_STANDALONE=true
RUN pnpm run build

# Stage 3: Runner
FROM node:26-alpine3.24@sha256:0b36e8c136b94cd4fcf02188228e76c31ad5872eef3fec8cbd2eee500cfd9e80 AS runner
ARG BASELINE_BUILD_SHA
ARG BASELINE_BUILD_INPUT_TREE_SHA256
LABEL org.opencontainers.image.revision="${BASELINE_BUILD_SHA}" \
      io.egov.ui-quality.build-input-tree-sha256="${BASELINE_BUILD_INPUT_TREE_SHA256}"
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Standalone starts with node directly; base npm and its launchers are not runtime dependencies.
RUN rm -rf /usr/local/lib/node_modules/npm && rm -f /usr/local/bin/npm /usr/local/bin/npx

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# The traced server embeds its build configuration and needs no build tooling at runtime.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
