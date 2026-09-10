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
| `pre-commit` | 커밋 | 설치된 gitleaks로 staged 시크릿 검사 + DTO/Controller/api-docs.json/생성타입의 `codegen:verify(:zod)` 드리프트 점검 | 시크릿 탐지는 차단, gitleaks 미설치·codegen 드리프트는 경고 |
| `pre-push` | 푸시 | remote branch/tag 삭제-only는 전송할 object가 없어 즉시 종료한다. 그 외 push에서는 운영 계약을 먼저 실행하고, 문서-only는 fast-pass, Atlas HTML은 전용 계약만 추가 실행한다. 소스 변경은 공용 fail-closed 분류기로 backend/frontend 영향만 선택하며, 알 수 없는 파일은 양쪽 전체를 실행한다. 삭제와 일반 push가 섞이면 일반 push 범위는 그대로 검증한다. | ❌ 실행된 범위에서 차단 |

현재 계약 게이트는 `api-docs.json`과 생성 타입/Zod 파일이 Git에 추적되는지 먼저 확인한 뒤 diff를 판정한다. 하네스는 소스 변경의 pre-push 경로에도 연결하지만 훅은 우회 가능하므로 최종 병합 권위는 required CI다.

## 게이트 계층 (무엇이 어디서 도는가)

| 계층 | 명령 | 범위 | 상대 비용 |
|---|---|---|---|
| pre-commit | 자동 | 설치된 gitleaks의 시크릿 탐지는 차단(미설치 시 **경고 출력**)·계약 드리프트는 경고 | 낮음 |
| pre-push 문서-only | 자동 | 운영 계약 catalog 전체(공용 메모리·문서 링크 포함). Atlas HTML이면 전용 docs-as-code 계약 추가 | 낮음 |
| pre-push 소스 변경 | 자동 | 운영 계약 + 변경 영향이 있는 Java compile/`harnessTest` 또는 FE/E2E tsc·lint·폼 census·codegen·불변식 Vitest. backend-only에도 cross-stack Vitest 실행. 미분류 파일은 양쪽 실행 | 중간 |
| **Gradle 전수 lane** | `./gradlew localGate` | 하네스 + **실PG 스키마 검증** + 전 모듈 테스트 + **JaCoCo LINE 85%/BRANCH 70%** + 프론트 Vitest/전체소스 coverage 래칫. pre-push의 모든 정적 검사를 포함하는 superset은 아님 | 높음 |
| **통합 전수 진입점** | `npm run verify` | 운영/문서 계약 + backend 전수 lane + FE codegen·lint·타입·build·bundle·coverage. E2E와 원격 ruleset은 각각 `verify:e2e`/`verify:ops` | 높음 |
| CI | `.github/workflows/ci.yml` | 변경 scope에 따른 빌드·실PG 스키마·번들·E2E·뮤테이션과 **secret-scan**·**secure-coding(CodeQL)**. 안정 required context 6개로 결과 집계 | 가장 높음 |

[governance gates manifest](../config/governance/gates.json)가 governance JUnit tag·ArchUnit tag·schema-validation tag와 Node/Frontend/E2E/mutation runner catalog를 중앙 등록한다. 계약 테스트는 실제 source census, 실행 task, CI/훅 소비자와 quality ratchet을 대조하고 `baseline-manifest.properties`는 보호 파일의 tamper hash를 추가로 고정한다. pre-push 하나를 전체 하네스 실행 증거로 간주하지 말고 변경 범위에 맞는 registry consumer 결과를 확인한다.

pre-push와 `npm run verify`는 CodeQL 분석을 직접 실행하지 않는다. 운영 계약 catalog의 SAST 정책 테스트와 실제 소스 분석을 구분한다. 로컬 분석은 `npm run verify:sast -- java` / `javascript`, 실제 탐지·거절 fixture는 `npm run verify:sast:probe -- java` / `javascript`로 실행하며 CodeQL 설치가 필요하다. [CI 시큐어코딩 안내](../docs/03-guides/cicd-pipeline.md#시큐어코딩-정적-분석-sast)를 따른다.

### 입력 의미 계약 게이트

`InputContractMirrorLinterTest`가 등록된 입력 DTO의 문자열 길이·Y/N enum·필수 제약 종류와 validation group을 Entity 저장 상한 및 `api-docs.json`과 대조하고, 중첩 DTO의 cascade·null item 거절·item schema 연결과 서버 소유 필드의 Jackson/OpenAPI read-only 방향도 확인한다. 대상 목록과 필드 수는 테스트 소스가 정본이며 검사 본문은 baseline full-source hash로 보호된다. 하류 `codegen:verify`/`codegen:verify:zod`와 결합해 등록된 길이·enum·required/nullability·중첩 schema·요청 방향의 Entity → DTO → OpenAPI → TypeScript/Zod 드리프트를 pre-push에서 차단한다. `@NotBlank`의 공백 의미 보존과 root controller validation reachability 전수 검사는 아직 이 게이트 범위가 아니다.

### 첨부 할당 인가 게이트

`AttachmentSourceRegistryLinterTest`는 `atchFileSn`을 가진 엔티티와 참조원 registry를 양방향으로 대조하는 기존 열람 도달성 검사에 더해, `business-core`·`business-app`의 프로덕션 서비스 계층에서 클라이언트가 선택한 첨부 assignment carrier를 exact census로 수집한다. 쓰기 경로는 `AttachmentAssignmentPolicy`의 원 업로더 가드가 엔티티·물리 파일 변경보다 먼저 오는지까지 검사하며, 미등록 writer·가드 삭제·가드 후행은 하네스를 red로 만든다. 파일 삭제 API처럼 새 업무 참조를 만들지 않는 경로는 이 census 범위가 아니다. 판정 본문은 baseline full-source hash로 보호된다.

### 대표 거버넌스 하네스

| 클래스 | 막는 회귀 |
|---|---|
| `SignupContractLinterTest` | 공개 회원가입 DTO 에 권한 필드 재유입(= 요청 1건 권한 상승) |
| `SeedLocationLinterTest` | 알려진 자격증명 해시가 운영 마이그레이션 경로로 재유입 |
| `ConfigSafetyLinterTest` | 배포 형상이 개발 기본값으로 재고착(actuator 확대 노출·prod jdbc-url 누락·프로파일 오버레이 소멸) |
| `SecretLiteralLinterTest` | 배포 스크립트의 시크릿 리터럴 인라인·prod 플레이스홀더 기본값 부활 |
| `HandlerReachesServiceLinterTest` | 저장 경로 없는 쓰기 핸들러가 200/success 반환(거짓 성공) |
| `AttachmentSourceRegistryLinterTest` | 첨부 참조원 누락·미등록 writer·원 업로더 가드 삭제 및 저장 후행 |
| `DockerfilePackageManagerLinterTest` | 배포 이미지가 CI 검증 트리와 다른 패키지 매니저로 빌드 |

### pre-push fast-pass 정책

삭제-only push는 로컬 object가 없어 코드 검증 대상이 아니므로 운영 계약 실행 전에 종료한다. 삭제와 일반 ref update가 섞이면 삭제 ref만 범위에서 빼고 object를 전송하는 update를 정상 검증한다. stdin이 없거나 범위를 알 수 없는 경우의 fail-closed fallback은 그대로 유지한다.

공용 [변경 분류기](../scripts/ci-change-scope.mjs)가 경로·확장자·삭제·rename 이전 경로를 함께 판정한다. 일반 문서·이미지·폰트는 fast-pass 대상이지만 `.githooks/`, 헌법, baseline manifest, Gradle 설정, wrapper, Dockerfile, 실행 스크립트처럼 게이트·규범에 영향을 주는 경로는 Markdown이라도 소스 경로를 탄다. `frontend/public/governance_harness_atlas.html`은 전용 계약 테스트가 통과한 경우에만 fast-pass한다.

### 실 PostgreSQL 스키마 검증 (`./gradlew :api-server:schemaValidationTest`)

빈 PostgreSQL 17 컨테이너에 **Flyway 마이그레이션 전량을 적용**한 뒤 Hibernate `ddl-auto: validate`로 엔티티 매핑을 대조한다(**Docker 필요**). 모듈별 H2 `create`/`create-drop` 결과는 운영 물리 스키마 정합 증거가 아니다.

Docker 없는 환경을 깨지 않도록 기본 `api-server:test`에서는 `schema-validation` 태그를 제외한다. 전용 태스크·`localGate`·`verify:full`은 이를 실행하며 CI는 classifier의 `schema=true`인 경우 실행한다. 이 설명은 API 스키마 lane의 경계이며 독립 `migration-tool:test`의 PostgreSQL 테스트까지 Docker 불필요하다는 뜻은 아니다.

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

*Last reviewed against current sources: 2026-09-10.*
