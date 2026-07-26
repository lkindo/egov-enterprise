# .githooks — 공유 git 훅 (GEMINI.md §0.6 기계적 강제)

`GEMINI.md` §0.6의 컴파일 무결성 게이트와 §4의 계약 드리프트 점검을 prose 규칙에서 **기계적 강제**로 승격한다. Gemini·Claude 등 어떤 operator가 커밋/푸시하든 동일하게 적용된다.

## 설치 (클론마다 1회)
```sh
git config core.hooksPath .githooks
```
> `core.hooksPath`는 클론별 로컬 설정이라 커밋되지 않는다. 새 클론에서 한 번 실행한다.

## 동작
| 훅 | 시점 | 동작 | 강도 |
|----|------|------|------|
| `pre-commit` | 커밋 | DTO/Controller/api-docs.json/생성타입 스테이징 시 `codegen:verify(:zod)` 드리프트 점검 | ⚠ 경고(비차단) |
| `pre-push` | 푸시 | `./gradlew compileJava compileTestJava` + `npx tsc --noEmit` + (프론트 존재 시) codegen 드리프트 게이트(`codegen:verify` + `codegen:verify:zod` — api-docs.json ↔ generated-api.d.ts/generated-zod.ts 정합) + **하네스 린터**(`:api-server:harnessTest`) | ❌ 차단 |

> **하네스 린터를 pre-push 로 올린 이유(2026-07-26)**: 하네스에는 헌법/표준 게이트가 11종 있었지만 실행 경로가 CI(`build check`)뿐이었고 **CI 는 과금차단** 상태였다. 즉 "게이트는 있는데 어디서도 돌지 않는" 상태였고, 그래서 동결 베이스라인을 비우거나 예외 목록을 신설해 신호를 지운 변경이 두 번 모두 그린으로 통과했다. 새 린터를 다는 것보다 **있는 린터를 돌게 만드는 것**이 우선이다. 실측 소요 **1m58s**(대부분은 Spring 컨텍스트를 띄우는 `SecurityAuthAnnotationLinterTest`).

## 게이트 계층 (무엇이 어디서 도는가)

| 계층 | 명령 | 범위 | 소요(실측) |
|---|---|---|---|
| pre-commit | 자동 | 시크릿 스캔·계약 드리프트 경고 | 수 초 |
| pre-push | 자동 | 컴파일 + tsc + codegen + **하네스 13종** | ~2분 |
| **병합 전 전수** | `./gradlew localGate` | 위 + **실PG 스키마 검증** + business/foundation 전체 테스트 | ~10분 |
| CI | `.github/workflows/ci.yml` | 전체 + 실PG 스키마 검증 + E2E + 뮤테이션 | (과금차단 중) |

### 실 PostgreSQL 스키마 검증 (`./gradlew :api-server:schemaValidationTest`)

빈 PostgreSQL 17 컨테이너에 **Flyway 마이그레이션 전량을 적용**한 뒤 Hibernate `ddl-auto: validate` 로 전 엔티티 매핑을 대조한다(실측 2m14s, **Docker 필요**). 단위 테스트 프로파일은 H2 + `create-drop` 이라 "엔티티가 엔티티와 일치한다" 는 동어반복만 검증한다 — 2026-07-26 사고(36자 UUID ↔ `varchar(7)`)가 전부 그린이었던 이유다.

Docker 없는 환경을 깨지 않도록 기본 `test` 태스크에서는 `schema-validation` 태그로 제외되지만, **조용히 스킵되는 것이 아니라** 전용 태스크·`localGate`·CI 에서 반드시 실행된다.

> Windows/Docker Desktop 함정(빌드 스크립트에 이미 반영): Testcontainers 는 `//./pipe/docker_engine` 만 찾고, Docker Engine 29 는 `MinAPIVersion=1.44` 라 구버전 API 협상이 400 으로 거부된다. 증상은 `docker version` 은 정상인데 테스트만 "Could not find a valid Docker environment" 다. 다른 엔진을 쓰면 `DOCKER_HOST` / `DOCKER_API_VERSION` 으로 덮어쓴다.

> `business-*` 모듈 테스트는 실측 **7m48s** 라 push 마다 돌릴 수 없다. 그래서 pre-push 에서 제외하고 `localGate` 로 분리했다 — 제외 사실을 숨기지 않기 위해 여기에 명시한다. "HEAD 자체가 red" 인 상태(2026-07-26 §6.2)는 이 계층에서만 잡힌다.

## 훅 자동 설치

`core.hooksPath` 는 **클론별 로컬 설정이라 커밋되지 않는다** — 새 클론에서는 모든 훅 게이트가 꺼진 상태로 시작한다. 이를 막기 위해 `installGitHooks` 태스크가 **모든 `compileJava` 실행 시** 값이 비어 있으면 `.githooks` 로 설정한다(이미 다른 값이면 존중). 비활성화: `NO_HOOK_INSTALL=1`.

## 우회
- 일시 우회: `git commit --no-verify` / `git push --no-verify`
- 세션 우회: `SKIP_HOOKS=1 git push`
- 하네스만 우회: `SKIP_HARNESS=1 git push` (컴파일·계약 게이트는 유지)
- 완전 해제: `git config --unset core.hooksPath`

> pre-commit이 드리프트를 **경고만** 하는 이유: `api-docs.json` 자체가 stale이면 재생성이 오탐을 낳는다. 차단은 결정론적인 pre-push 게이트(컴파일 + 계약 codegen 드리프트)에만 둔다.
