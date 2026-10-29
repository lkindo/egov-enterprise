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
| `pre-push` | 푸시 | remote branch/tag 삭제-only는 전송할 object가 없어 즉시 종료한다. 그 외 push에서는 변경 범위를 판정·출력하고 생성물 신선도(`npm run regen -- --check`)를 먼저 본다. 문서-only는 운영 계약(Atlas HTML이면 전용 계약 추가)을 통과한 뒤 fast-pass한다. 소스 변경은 공용 fail-closed 분류기로 온라인 backend/독립 migration/frontend를 선택하고, 컴파일·타입·lint·폼 census, 불변식 Vitest·원문 계약 Vitest(src/__tests__ 밖에서 저장소 파일을 직접 읽는 시험 — 목록은 `scripts/frontend-source-contracts.mjs`가 매번 계산)·cross-stack Vitest, 하네스를 먼저 돌리고 운영 계약을 마지막에 실행한다. 프런트 타입 검사는 `pnpm run type-check`(next typegen 으로 라우트 타입을 새로 만든 뒤 tsc — `.next/dev` 사본은 제외)다. 세 Vitest 단계는 `scripts/vitest-timeout-rerun.mjs`로 돌아, 실패가 모두 Vitest 시간 초과일 때만 그 파일을 단독으로 한 번 다시 돌고 단언·모듈·처리되지 않은 오류는 그대로 막는다(DEC-OPS-390, CI 는 재실행 없음). 계약 codegen 드리프트는 맨 앞의 생성물 신선도 검사가 프런트 `codegen:verify(:zod)`와 같은 검증기로 보며 프런트 단계에서 다시 돌리지 않는다. 알 수 없는 파일은 전체를 실행한다. 삭제와 일반 push가 섞이면 일반 push 범위는 그대로 검증한다. | ❌ 실행된 범위에서 차단 |

현재 계약 게이트는 `api-docs.json`과 생성 타입/Zod 파일이 Git에 추적되는지 확인한다. 그 뒤 index 와 작업 트리 둘 다 본다 — index 의 스펙으로 임시 디렉터리에 다시 만든 결과를 index 생성물과 비교하고, 작업 트리가 index 와 다르면 작업 트리 쌍도 비교한다. 검증은 작업 파일과 index를 수정하지 않으며 줄바꿈 차이만 정규화한다. 하네스는 소스 변경의 pre-push 경로에도 연결하지만 훅은 우회 가능하므로 최종 병합 권위는 required CI다.

pre-push는 검사할 범위를 push 범위(stdin의 `remote_sha..local_sha`)로 고르지만, 컴파일·타입·codegen·lint·운영 계약·Vitest·하네스는 모두 push하는 커밋이 아니라 현재 체크아웃(index·작업 트리)에서 돈다. 다른 브랜치를 push하거나 커밋하지 않은 변경이 있으면 로컬 결과는 push하는 커밋의 증거가 아니며, 그 커밋의 권위는 required CI다.

pre-push와 `verify`는 고정 단계 ID·시간·결과를 ignored `build/verification-runs/<UUID>.jsonl`에 관측용으로 남긴다. 명령·환경·출력 원문은 기록하지 않으며 기록 오류가 검사를 건너뛰거나 실패를 통과시키지 않는다. 미완결 기록은 성공이 아니고, 이 기록으로 훅·CI·독립 재검증을 생략할 수 없다. 통합 점검의 폼 census·전체 하네스는 유지한다([F2 판단과 기록 해석](../docs/03-guides/harness-improvement-pilot.md)).

pre-push와 `npm run verify`는 실패가 잦고 짧은 정적 검사를 운영 계약(로컬 약 11분)보다 먼저 돌린다. pre-push 소스 경로와 `verify:fast`·`verify:push`는 불변식·원문 계약 Vitest·cross-stack Vitest·하네스(`verify:fast`는 하네스 없음)도 운영 계약 앞에서 돌리고 운영 계약을 마지막에 돈다. 그 검사가 실패하면 운영 계약을 기다리지 않는다. 성공하면 같은 명령과 인자가 모두 실행된다. 총시간은 캐시·실행 조건의 영향을 받으므로 실측한다. 운영 계약을 포함하는 범위에서는 정확히 한 번 돈다(`verify:ops`·`verify:migration`과 삭제 전용 push는 돌지 않는다). Java 컴파일을 계약 앞에서 보는 것은 pre-push 소스 경로와 `verify:fast`·`verify:push`뿐이다 — `verify:full`·`verify:be`의 Java 컴파일은 backend 전수 lane(gradle 한 줄) 안에서 운영 계약 뒤에 돌고, `verify:be`·`verify:docs`는 그 다음 계약이 먼저다. pre-push 두 경로와 운영 계약을 부르는 모든 `verify` 범위(`fast`·`push`·`full`은 CodeQL 근사 다음)가 맨 앞에서 `npm run regen -- --check`(로컬 약 20초)로 낡은 생성물·해시 결속(생성 계약·권한·슬롯·경계 census·화면 목록·URL census 승인·SAST 예외·하네스 기준선·Atlas)과 regen 이 고치지 않는 손 결속 원장(operation census 의 수·래칫, IA 처분 제안의 라우트 원장 결속 해시, `scripts/ledger-precheck.mjs` 의 태그 시험 게이트 등록·미배정 권한 안내·메뉴 스냅숏 해시)을 먼저 알린다 — 운영 계약·CI codegen 게이트가 다시 보는 검사의 부분집합이라 새 판정이 아니다. 이 검사의 생성 계약 항목(`scripts/verify-generated-contracts.mjs api`·`zod`)이 pre-push·`verify`의 유일한 로컬 계약 드리프트 게이트이며 `codegen:verify(:zod)`를 따로 다시 돌리지 않는다. 실패하면 `npm run regen` 으로 다시 만들고, 손 결속 원장은 그 출력대로 고친다([재생성 순서](../docs/03-guides/orchestration-protocol.md#64-main-최신화-뒤-생성물-재생성)). PowerShell 의 npm 래퍼는 `--` 를 지우므로 손으로 검사할 때는 `node scripts/regenerate.mjs --check` 로 직접 부른다 — npm 이 플래그를 삼킨 인자 없는 실행은 쓰기 재생성 대신 종료 코드 2로 멈춘다. `scripts/pre-push-ref-contract.test.mjs`가 순서와 실패 전파를 고정한다.

## 게이트 계층 (무엇이 어디서 도는가)

| 계층 | 명령 | 범위 | 상대 비용 |
|---|---|---|---|
| pre-commit | 자동 | 설치된 gitleaks의 시크릿 탐지는 차단(미설치 시 **경고 출력**)·계약 드리프트는 경고 | 낮음 |
| pre-push 문서-only | 자동 | 생성물 신선도 → 운영 계약 catalog 전체(공용 메모리·문서 링크 포함). Atlas HTML이면 전용 docs-as-code 계약 추가 | 전체 운영 계약 비용 포함 |
| pre-push 소스 변경 | 자동 | 생성물 신선도(계약 codegen 드리프트 포함) → CodeQL 근사(바뀐 JS·TS) → 영향에 따른 온라인 Java compile, 독립 이관 compile, FE 라우트 타입 재생성·tsc, E2E tsc·lint·폼 census → 불변식 Vitest → 원문 계약 Vitest(backend-only면 cross-stack Vitest, 셋 다 시간 초과만 단독 1회 재실행) → `harnessTest` → 운영 계약(맨 끝). 미분류 파일은 전체 실행 | 운영 계약 비용 + 영향 범위 검사 |
| **Gradle 전수 lane** | `./gradlew localGate` | 하네스 + **실PG 스키마 검증** + 전 모듈 테스트 + **JaCoCo LINE 85%/BRANCH 70%** + 프론트 Vitest/전체소스 coverage 래칫. pre-push의 모든 정적 검사를 포함하는 superset은 아님 | 높음 |
| **통합 전수 진입점** | `npm run verify` | CodeQL 근사 → 생성물 신선도(계약 codegen 포함) → FE 타입·lint·폼 census → 운영 계약 → backend 전수 lane → FE build·bundle·coverage. E2E와 원격 ruleset은 각각 `verify:e2e`/`verify:ops` | 높음 |
| CI | `.github/workflows/ci.yml` | 변경 scope에 따른 빌드·실PG 스키마·번들·E2E·뮤테이션과 **secret-scan**·**secure-coding(CodeQL)**. 안정 required context 6개로 결과 집계 | 가장 높음 |

`npm run verify`의 하위 명령은 기본 `TZ=Asia/Seoul`로 돌고, 명시한 `TZ`가 이긴다. CI 러너는 UTC이므로 날짜 경계에 닿는 변경은 `npx cross-env TZ=UTC npm run verify:<범위>`로 CI 조건을 한 번 더 재현한다(bash·PowerShell·cmd에서 같은 형태로 동작하고 셸 세션에 `TZ`를 남기지 않는다). pre-push는 시간대를 강제하지 않는다(그 기계의 시간대를 따른다). 시험 JVM은 `build.gradle`이 따로 UTC로 고정한다.

[governance gates manifest](../config/governance/gates.json)가 governance JUnit tag·ArchUnit tag·schema-validation tag와 Node/Frontend/E2E/mutation runner catalog를 중앙 등록한다. 계약 테스트는 실제 source census, 실행 task, CI/훅 소비자와 quality ratchet을 대조하고 `baseline-manifest.properties`는 보호 파일의 tamper hash를 추가로 고정한다. CI binding은 선언한 job과 step 조건까지, `scripts/verify.mjs` binding은 tier가 뜻하는 범위 분기(local-full = `full`, local-e2e = `e2e`)에서 호출을 따라가 닿는 줄인지와 조건 여부까지 대조한다. pre-push 하나를 전체 하네스 실행 증거로 간주하지 말고 변경 범위에 맞는 registry consumer 결과를 확인한다.

pre-push와 `npm run verify`는 CodeQL 분석을 직접 실행하지 않는다. 대신 CI CodeQL이 반복해 막아 온 세 규칙의 구문 트리 근사(`npm run sast:approx`)를 pre-push 소스 경로(생성물 신선도 다음, push가 바꾼 JS·TS만)와 `verify` fast·push·full 맨 앞에서 돌린다. 근사는 판정 권위가 아니다([CI 가이드](../docs/03-guides/cicd-pipeline.md#시큐어코딩-정적-분석-sast)). 운영 계약 catalog의 SAST 정책 테스트와 실제 소스 분석을 구분한다. 로컬 분석은 `npm run verify:sast -- java` / `javascript`, 실제 탐지·거절 fixture는 `npm run verify:sast:probe -- java` / `javascript`로 실행하며 CodeQL 설치가 필요하다. [CI 시큐어코딩 안내](../docs/03-guides/cicd-pipeline.md#시큐어코딩-정적-분석-sast)를 따른다.

### 입력 의미 계약 게이트

`InputContractMirrorLinterTest`가 등록된 입력 DTO의 문자열 길이·Y/N enum·필수 제약 종류와 validation group을 Entity 저장 상한 및 `api-docs.json`과 대조하고, 중첩 DTO의 cascade·null item 거절·item schema 연결과 서버 소유 필드의 Jackson/OpenAPI read-only 방향도 확인한다. 대상 목록과 필드 수는 [입력 계약 원장](../config/governance/input-contract-mirror-census.json)이 정본이며(baseline `__registry` hash로 동결), 검사 본문은 baseline full-source hash로 보호된다. 원장 항목마다 소유 pack을 적어 재사용 base 축소 프로필에서도 남은 표적을 검사한다(DEC-OPS-090). 하류 `codegen:verify`/`codegen:verify:zod`와 결합해 등록된 길이·enum·required/nullability·중첩 schema·요청 방향의 Entity → DTO → OpenAPI → TypeScript/Zod 드리프트를 pre-push에서 차단한다. `@NotBlank`의 공백 의미 보존과 root controller validation reachability 전수 검사는 아직 이 게이트 범위가 아니다.

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

삭제-only push는 로컬 object가 없어 코드 검증 대상이 아니므로 운영 계약 실행 전에 종료한다. 삭제와 일반 ref update가 섞이면 삭제 ref만 범위에서 빼고 object를 전송하는 update를 정상 검증한다. stdin이 없거나 범위를 알 수 없는 경우의 fail-closed fallback은 그대로 유지한다. ref 하나의 변경 조회라도 실패하면 성공한 조회와 실패한 조회의 부분 출력을 모두 버리고 전체 게이트를 실행한다.

공용 [변경 분류기](../scripts/ci-change-scope.mjs)가 경로·확장자·삭제·rename 이전 경로를 함께 판정한다. 일반 문서·이미지·폰트는 fast-pass 대상이지만 `.githooks/`, 헌법, baseline manifest, Gradle 설정, wrapper, Dockerfile, 실행 스크립트처럼 게이트·규범에 영향을 주는 경로는 Markdown이라도 소스 경로를 탄다. `frontend/public/governance_harness_atlas.html`은 전용 계약 테스트가 통과한 경우에만 fast-pass한다.

Atlas의 `frontend/atlas/**` 원본과 `scripts/build-atlas.mjs`·`scripts/atlas-*.mjs`도 동일한 Atlas 계약을 선택한다. 이 경로들은 소스 검사 범위를 유지하며 문서 fast-pass로 분류하지 않는다. 생성물 신선도 검사는 운영 계약 catalog에 연결한다.

Atlas가 frontend 불변식 또는 backend cross-stack 실행에 포함되면 단독 Atlas 실행을 중복하지 않는다. `verify:fast`·`verify:push`는 불변식 실행이, `verify:full`은 전체 coverage가 Atlas를 포함한 횡단 계약을 한 번씩 실행한다. `verify:docs`와 `verify:be` 단독 경로도 각각 필요한 검사를 유지한다. Atlas 도구와 operation 소비 원장은 공용 분류기의 소비자 표로 검사 축을 정하며, 미분류 입력이 섞이면 전체 검증으로 돌아간다.

문서 링크 계약은 루트·`docs`·훅·공용 메모리와 소유한 3대 헌법의 Markdown artifact 및 metadata 참조를 검사한다. 파일뿐 아니라 Markdown 절·HTML ID·순수 앵커도 대조한다. 코드 블록·인라인 코드의 예시는 링크로 실행하지 않으며, `table://` 메타 표준 참조는 DB 실측 증거를 대신하는 파일 경로로 취급하지 않는다.

### 실 PostgreSQL 스키마 검증 (`./gradlew :api-server:schemaValidationTest`)

빈 PostgreSQL 17 컨테이너에 **Flyway 마이그레이션 전량을 적용**한 뒤 Hibernate `ddl-auto: validate`로 엔티티 매핑을 대조한다(**Docker 필요**). 모듈별 H2 `create`/`create-drop` 결과는 운영 물리 스키마 정합 증거가 아니다.

Docker 없는 환경을 깨지 않도록 기본 `api-server:test`에서는 `schema-validation` 태그를 제외한다. 전용 태스크·`localGate`·`verify:full`은 이를 실행하며 CI는 classifier의 `schema=true`인 경우 실행한다. 이 설명은 API 스키마 lane의 경계이며 독립 `migration-tool:test`의 PostgreSQL 테스트까지 Docker 불필요하다는 뜻은 아니다.

> `docker version`은 성공하지만 Testcontainers가 엔진을 찾지 못하면 현재 Docker context와 `DOCKER_HOST` / `DOCKER_API_VERSION` 오버라이드를 확인한다. 특정 Docker 버전의 과거 기본값을 그대로 가정하지 않는다.

> `business-*` 모듈 전수 테스트와 프론트 전체 coverage는 pre-push에서 제외하고 `npm run verify`(기본 `full`)와 그 Gradle 부분집합인 `localGate`가 소유한다. 따라서 pre-push green만으로 해당 범위가 검증됐다고 보고하지 않는다.

## 훅 자동 설치

`core.hooksPath` 는 **클론별 로컬 설정이라 커밋되지 않는다** — 새 클론에서는 모든 훅 게이트가 꺼진 상태로 시작한다. 이를 막기 위해 `installGitHooks` 태스크가 **모든 `compileJava` 실행 시** 값이 비어 있으면 `.githooks` 로 설정한다(이미 다른 값이면 존중). 비활성화: `NO_HOOK_INSTALL=1`.

## 우회
- 일시 우회: `git commit --no-verify` / `git push --no-verify`
- 세션 우회: `SKIP_HOOKS=1 git push`
- 하네스만 우회: `SKIP_HARNESS=1 git push` (컴파일·계약 게이트는 유지)
- 완전 해제: `git config --unset core.hooksPath`

> 에이전트는 사용자가 명시적으로 지시한 경우에만 우회한다([SOP §6.2](../docs/03-guides/orchestration-protocol.md#62-검증은-한-커밋에-한-번)). 실행 전 가드([agent-guard](../scripts/agent-guard.mjs))가 위 넷과 `git -c core.hooksPath=…` 를 보고 묻는다.

> pre-commit이 드리프트를 **경고만** 하는 이유: `api-docs.json` 자체가 stale이면 재생성이 오탐을 낳는다. 차단은 결정론적인 pre-push 게이트(컴파일 + 계약 codegen 드리프트)에만 둔다.

*Last reviewed against current sources: 2026-10-17.*
