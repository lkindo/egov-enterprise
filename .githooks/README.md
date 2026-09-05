# .githooks — AGENTS.md 범위별 검증을 구현하는 공유 git 훅

[AGENTS.md](../AGENTS.md#verification-by-change-scope)의 범위별 검증과 계약 드리프트 점검을 prose 규칙에서 **기계적 강제**로 승격한다. Gemini·Claude·Codex 등 어떤 operator가 커밋/푸시하든 동일하게 적용된다.

## 설치 (클론마다 1회)
```sh
git config core.hooksPath .githooks
```
> `core.hooksPath`는 클론별 로컬 설정이라 커밋되지 않는다. 새 클론에서 한 번 실행한다.

## 동작
| 훅 | 시점 | 동작 | 강도 |
|----|------|------|------|
| `pre-commit` | 커밋 | DTO/Controller/api-docs.json/생성타입 스테이징 시 `codegen:verify(:zod)` 드리프트 점검 | ⚠ 경고(비차단) |
| `pre-push` | 푸시 | remote branch/tag 삭제-only는 전송할 object가 없어 즉시 종료한다. 그 외 push에서는 운영 계약을 먼저 실행하고, 문서-only는 fast-pass, Atlas HTML은 전용 계약만 추가 실행한다. 소스 변경은 공용 fail-closed 분류기로 backend/frontend 영향만 선택하며, 알 수 없는 파일은 양쪽 전체를 실행한다. 삭제와 일반 push가 섞이면 일반 push 범위는 그대로 검증한다. | ❌ 실행된 범위에서 차단 |

현재 계약 게이트는 `api-docs.json`과 생성 타입/Zod 파일이 Git에 추적되는지 먼저 확인한 뒤 diff를 판정한다. 하네스는 소스 변경의 pre-push 경로에도 연결하지만 훅은 우회 가능하므로 최종 병합 권위는 required CI다.

## 게이트 계층 (무엇이 어디서 도는가)

| 계층 | 명령 | 범위 | 상대 비용 |
|---|---|---|---|
| pre-commit | 자동 | 시크릿 스캔(미설치 시 **경고 출력**)·계약 드리프트 경고 | 낮음 |
| pre-push 문서-only | 자동 | 공용 메모리 계약 + 문서 링크 무결성. Atlas HTML이면 전용 docs-as-code 계약 추가 | 낮음 |
| pre-push 소스 변경 | 자동 | 운영 계약 + 변경 영향이 있는 Java compile/`harnessTest` 또는 FE/E2E tsc·lint·codegen·불변식 Vitest. 미분류 파일은 양쪽 실행 | 중간 |
| **Gradle 전수 lane** | `./gradlew localGate` | 하네스 + **실PG 스키마 검증** + 전 모듈 테스트 + **JaCoCo LINE 85%/BRANCH 70%** + 프론트 Vitest/전체소스 coverage 래칫. pre-push의 모든 정적 검사를 포함하는 superset은 아님 | 높음 |
| **통합 전수 진입점** | `npm run verify` | 운영/문서 계약 + backend 전수 lane + FE codegen·lint·타입·build·bundle·coverage. E2E와 원격 ruleset은 각각 `verify:e2e`/`verify:ops` | 높음 |
| CI | `.github/workflows/ci.yml` | **secret-scan(gitleaks)** + 전체 + 실PG 스키마 검증 + 프론트 gzip 번들 예산 + E2E + 뮤테이션 | 가장 높음 |

[governance gates manifest](../config/governance/gates.json)가 governance JUnit tag·ArchUnit tag·schema-validation tag와 Node/Frontend/E2E/mutation runner catalog를 중앙 등록한다. 계약 테스트는 실제 source census, 실행 task, CI/훅 소비자와 quality ratchet을 대조하고 `baseline-manifest.properties`는 보호 파일의 tamper hash를 추가로 고정한다. pre-push 하나를 전체 하네스 실행 증거로 간주하지 말고 변경 범위에 맞는 registry consumer 결과를 확인한다.

### 입력 의미 계약 게이트

`InputContractMirrorLinterTest`가 등록된 입력 DTO의 문자열 길이·Y/N enum·필수 제약 종류와 validation group을 Entity 저장 상한 및 `api-docs.json`과 대조하고, 중첩 DTO의 cascade·null item 거절·item schema 연결도 확인한다. 대상 목록과 필드 수는 테스트 소스가 정본이며 검사 본문은 baseline full-source hash로 보호된다. 하류 `codegen:verify`/`codegen:verify:zod`와 결합해 등록된 길이·enum·required/nullability·중첩 schema의 Entity → DTO → OpenAPI → TypeScript/Zod 드리프트를 pre-push에서 차단한다. `@NotBlank`의 공백 의미 보존과 root controller validation reachability 전수 검사는 아직 이 게이트 범위가 아니다.

### 대표 거버넌스 하네스

| 클래스 | 막는 회귀 |
|---|---|
| `SignupContractLinterTest` | 공개 회원가입 DTO 에 권한 필드 재유입(= 요청 1건 권한 상승) |
| `SeedLocationLinterTest` | 알려진 자격증명 해시가 운영 마이그레이션 경로로 재유입 |
| `ConfigSafetyLinterTest` | 배포 형상이 개발 기본값으로 재고착(actuator 확대 노출·prod jdbc-url 누락·프로파일 오버레이 소멸) |
| `SecretLiteralLinterTest` | 배포 스크립트의 시크릿 리터럴 인라인·prod 플레이스홀더 기본값 부활 |
| `HandlerReachesServiceLinterTest` | 저장 경로 없는 쓰기 핸들러가 200/success 반환(거짓 성공) |
| `DockerfilePackageManagerLinterTest` | 배포 이미지가 CI 검증 트리와 다른 패키지 매니저로 빌드 |

### pre-push fast-pass 정책

삭제-only push는 로컬 object가 없어 코드 검증 대상이 아니므로 운영 계약 실행 전에 종료한다. 삭제와 일반 ref update가 섞이면 삭제 ref만 범위에서 빼고 object를 전송하는 update를 정상 검증한다. stdin이 없거나 범위를 알 수 없는 경우의 fail-closed fallback은 그대로 유지한다.

문서·이미지·폰트 등 **확실히 비코드인 확장자만** fast-pass하고 나머지는 소스 변경으로 간주한다. `.githooks/`, baseline manifest, Gradle 설정, wrapper, Dockerfile, 스크립트처럼 게이트를 바꿀 수 있는 파일은 확장자 유무와 관계없이 전체 소스 경로를 탄다. `frontend/public/governance_harness_atlas.html`은 전용 계약 테스트가 통과한 경우에만 fast-pass한다.

### 실 PostgreSQL 스키마 검증 (`./gradlew :api-server:schemaValidationTest`)

빈 PostgreSQL 17 컨테이너에 **Flyway 마이그레이션 전량을 적용**한 뒤 Hibernate `ddl-auto: validate`로 엔티티 매핑을 대조한다(**Docker 필요**). 단위 테스트 프로파일의 H2 + `create-drop` 결과는 운영 물리 스키마 정합 증거가 아니다.

Docker 없는 환경을 깨지 않도록 기본 `test` 태스크에서는 `schema-validation` 태그로 제외되지만, **조용히 스킵되는 것이 아니라** 전용 태스크·`localGate`·CI 에서 반드시 실행된다.

> `docker version`은 성공하지만 Testcontainers가 엔진을 찾지 못하면 현재 Docker context와 `DOCKER_HOST` / `DOCKER_API_VERSION` 오버라이드를 확인한다. 특정 Docker 버전의 과거 기본값을 그대로 가정하지 않는다.

> `business-*` 모듈 전수 테스트와 프론트 전체 coverage는 pre-push에서 제외하고 `localGate`가 소유한다. 따라서 pre-push green만으로 해당 범위가 검증됐다고 보고하지 않는다.

## 훅 자동 설치

`core.hooksPath` 는 **클론별 로컬 설정이라 커밋되지 않는다** — 새 클론에서는 모든 훅 게이트가 꺼진 상태로 시작한다. 이를 막기 위해 `installGitHooks` 태스크가 **모든 `compileJava` 실행 시** 값이 비어 있으면 `.githooks` 로 설정한다(이미 다른 값이면 존중). 비활성화: `NO_HOOK_INSTALL=1`.

## 우회
- 일시 우회: `git commit --no-verify` / `git push --no-verify`
- 세션 우회: `SKIP_HOOKS=1 git push`
- 하네스만 우회: `SKIP_HARNESS=1 git push` (컴파일·계약 게이트는 유지)
- 완전 해제: `git config --unset core.hooksPath`

> pre-commit이 드리프트를 **경고만** 하는 이유: `api-docs.json` 자체가 stale이면 재생성이 오탐을 낳는다. 차단은 결정론적인 pre-push 게이트(컴파일 + 계약 codegen 드리프트)에만 둔다.
