# Stage 1: Dependencies
# [W1-H2] Node 20(EOL) → 22 LTS. 세 스테이지 모두 같은 태그·같은 다이제스트를 쓴다.
#   ⚠ 다이제스트 핀의 함정: 태그만 `22-alpine` 으로 바꾸고 다이제스트를 20 짜리로 두면
#     **다이제스트가 이기므로 실제로는 여전히 Node 20 이 빌드된다**(태그는 표시용이 된다).
#     아래 값은 2026-08-03 registry-1.docker.io 에서 library/node:22-alpine 의
#     manifest list 다이제스트를 실조회해 넣은 것이다. 갱신 시 반드시 함께 바꾼다:
#       T=$(curl -s "https://auth.docker.io/token?service=registry.docker.io&scope=repository:library/node:pull" | jq -r .token)
#       curl -sI -H "Authorization: Bearer $T" \
#         -H "Accept: application/vnd.oci.image.index.v1+json,application/vnd.docker.distribution.manifest.list.v2+json" \
#         https://registry-1.docker.io/v2/library/node/manifests/22-alpine | grep -i docker-content-digest
FROM node:25-alpine@sha256:bdf2cca6fe3dabd014ea60163eca3f0f7015fbd5c7ee1b0e9ccb4ced6eb02ef4 AS deps
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
FROM node:25-alpine@sha256:bdf2cca6fe3dabd014ea60163eca3f0f7015fbd5c7ee1b0e9ccb4ced6eb02ef4 AS builder
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
ENV BACKEND_API_URL=$BACKEND_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN pnpm run build

# Stage 3: Runner
FROM node:25-alpine@sha256:bdf2cca6fe3dabd014ea60163eca3f0f7015fbd5c7ee1b0e9ccb4ced6eb02ef4 AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./next.config.ts

# Copy the full .next directory (standalone mode is disabled in next.config.ts)
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

USER nextjs

EXPOSE 3000
ENV PORT=3000
CMD ["node", "node_modules/.bin/next", "start"]
