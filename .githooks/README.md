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
| `pre-push` | 푸시 | `./gradlew compileJava compileTestJava` + `npx tsc --noEmit` + (프론트 존재 시) codegen 드리프트 게이트(`codegen:verify` + `codegen:verify:zod` — api-docs.json ↔ generated-api.d.ts/generated-zod.ts 정합) + **하네스 린터 30종**(`:api-server:harnessTest`) | ❌ 차단 |

> **계약 게이트의 untracked 구멍(2026-08-01 봉합)**: `codegen:verify` 계열은 `git diff --exit-code <path>` 로 판정하는데, 대상 파일이 **언트랙이면 diff 가 무조건 exit 0** 이라 게이트가 조용히 vacuous 통과한다. 즉 `git rm --cached api-docs.json` 하나로 3중 계약 결속이 동시에 무력화됐다. (파일이 아예 없으면 `fatal: ambiguous argument` 로 loud fail 하므로, 위험 구간은 정확히 '디스크에는 있으나 언트랙' 하나다.) 이제 `git ls-files --error-unmatch` 선행 검사를 pre-push·`codegen:verify`·`codegen:verify:zod`·CI 4곳에 넣었다.

> **하네스 린터를 pre-push 로 올린 이유(2026-07-26)**: 하네스에는 헌법/표준 게이트가 11종 있었지만 실행 경로가 CI(`build check`)뿐이었고 **CI 는 과금차단** 상태였다. 즉 "게이트는 있는데 어디서도 돌지 않는" 상태였고, 그래서 동결 베이스라인을 비우거나 예외 목록을 신설해 신호를 지운 변경이 두 번 모두 그린으로 통과했다. 새 린터를 다는 것보다 **있는 린터를 돌게 만드는 것**이 우선이다. 실측 소요 **1m58s**(대부분은 Spring 컨텍스트를 띄우는 `SecurityAuthAnnotationLinterTest`).

## 게이트 계층 (무엇이 어디서 도는가)

| 계층 | 명령 | 범위 | 소요(실측) |
|---|---|---|---|
| pre-commit | 자동 | 시크릿 스캔(미설치 시 **경고 출력**)·계약 드리프트 경고 | 수 초 |
| pre-push | 자동 | 컴파일 + tsc + codegen(+**tracked 선행검사**) + **하네스 30종** | ~2분 |
| **병합 전 전수** | `./gradlew localGate` | 위 + **실PG 스키마 검증** + 전 모듈 테스트 + **JaCoCo 50%** + 프론트 Vitest/전체소스 coverage 래칫 | ~12분 |
| CI | `.github/workflows/ci.yml` | **secret-scan(gitleaks)** + 전체 + 실PG 스키마 검증 + 프론트 gzip 번들 예산 + E2E + 뮤테이션 | 상시 |

> **하네스 개수 정정(2026-08-15 실측)**: 두 수치를 구분해야 한다.
> - **실행 집합 = 30클래스/37테스트** — 현재 `nuri.api.harness` 패키지(= `harnessTest` 가 실제로 돌리는 것).
> - **동결 집합 = 36클래스** — `baseline-manifest.properties` 의 `__harness.classes`(4개 모듈). 이 중 6종(`RbacAuthorizationMatrixTest`, `SchemaValidationIntegrationTest`, business/foundation 의 ArchUnit 등)은 **harnessTest 필터 밖이라 pre-push 에서 돌지 않는다** — 실행 경로는 `test`/`localGate`/CI 다. "모든 하네스 게이트가 pre-push 에서 돈다" 는 전제는 거짓이므로 여기 명시한다.

### 2026-08-15 입력 의미 계약 게이트

`InputContractMirrorLinterTest` 2건이 사용자·콘텐츠·공통코드·권한·조직 관리자 입력 11 DTO의 길이 49필드와 Y/N enum 7필드를 Entity 저장 상한 및 `api-docs.json`과 대조한다. 하류 `codegen:verify`/`codegen:verify:zod`와 결합해 Entity → DTO → OpenAPI → TypeScript/Zod 드리프트를 pre-push에서 차단한다.

### 2026-08-01 Wave 0 신설 게이트 6종

| 클래스 | 막는 회귀 |
|---|---|
| `SignupContractLinterTest` | 공개 회원가입 DTO 에 권한 필드 재유입(= 요청 1건 권한 상승) |
| `SeedLocationLinterTest` | 알려진 자격증명 해시가 운영 마이그레이션 경로로 재유입 |
| `ConfigSafetyLinterTest` | 배포 형상이 개발 기본값으로 재고착(actuator 확대 노출·prod jdbc-url 누락·프로파일 오버레이 소멸) |
| `SecretLiteralLinterTest` | 배포 스크립트의 시크릿 리터럴 인라인·prod 플레이스홀더 기본값 부활 |
| `HandlerReachesServiceLinterTest` | 저장 경로 없는 쓰기 핸들러가 200/success 반환(거짓 성공) |
| `DockerfilePackageManagerLinterTest` | 배포 이미지가 CI 검증 트리와 다른 패키지 매니저로 빌드 |

### pre-push fast-pass 정책 변경(2026-08-01)

확장자 **allowlist → denylist 로 반전**했다. 종전에는 '코드로 인정할 확장자'를 열거했기 때문에, 확장자가 없거나 목록에 없는 파일이 전부 검증 없이 통과했다 — 그리고 하필 그 집합이 **게이트를 무력화할 수 있는 파일들**이었다: `.githooks/` 자신, `baseline-manifest.properties`(동결 기준), `gradle/libs.versions.toml`, `gradle-wrapper.properties`, `gradlew`, Dockerfile 2종, `scripts/*.mjs|ps1|sh`. 즉 게이트를 끄는 편집이 게이트를 통과했다(§0.7-H5).
이제는 문서·이미지·폰트 등 **확실히 비코드인 확장자만** fast-pass 하고 나머지는 전부 코드로 간주한다. 다중 ref 푸시에서 마지막 ref 만 평가하던 버그도 함께 고쳤다.

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
