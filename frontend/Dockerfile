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
FROM node:22-alpine@sha256:c610fcdfb1d5b4740dd70c284ed3cb16bb857e0f7166196e36a5501df7a3aa32 AS deps
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
FROM node:22-alpine@sha256:c610fcdfb1d5b4740dd70c284ed3cb16bb857e0f7166196e36a5501df7a3aa32 AS builder
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
FROM node:22-alpine@sha256:c610fcdfb1d5b4740dd70c284ed3cb16bb857e0f7166196e36a5501df7a3aa32 AS runner
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
# [2026-08-08 정정] 종전: CMD ["node", "node_modules/.bin/next", "start"]
#
#   ⚠ **이 이미지는 4개월간 기동 자체가 불가능했다.**
#   pnpm 이 만드는 `node_modules/.bin/next` 는 JS 파일이 아니라 **셸 스크립트 shim**(`#!/bin/sh`)이다.
#   그것을 `node` 로 실행하면 JS 파서가 셸 스크립트를 읽어 즉시 죽는다:
#       SyntaxError: missing ) after argument list
#       at wrapSafe (node:internal/modules/cjs/loader)
#   실측(2026-08-08): 컨테이너 State=exited, ExitCode=1, healthcheck 검사 **0회**.
#
#   왜 4개월간 아무도 몰랐나 — **이 이미지를 실제로 띄우는 경로가 하나뿐이었고 그것도 고장나 있었다.**
#     · ci.yml E2E  : `docker compose up -d db api` 만 — 프론트는 호스트에서 `pnpm run start:3001`
#     · release.yml : 이미지를 **빌드해서 푸시**만 한다(빌드는 성공하므로 CI 는 초록)
#     · zap-scan.yml: 유일하게 **띄우는** 곳 — 그런데 한 번도 성공한 적이 없었다
#   두 고장이 서로를 가리고 있었다. 즉 **레지스트리에 푸시된 이미지는 docker run 하면 즉시 죽는다.**
#
#   shim 은 셸로 실행해야 한다. exec 형식을 유지하면서 셸을 명시한다(PID 1 은 sh 가 되며,
#   `exec` 로 next 프로세스가 PID 1 을 이어받아 SIGTERM 이 그대로 전달된다).
CMD ["sh", "-c", "exec node_modules/.bin/next start"]
