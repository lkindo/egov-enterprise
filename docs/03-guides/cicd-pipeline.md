# CI/CD 파이프라인 가이드

본 프로젝트는 GitHub Actions 를 사용하여 자동화된 CI/CD 파이프라인을 운영합니다.

> 이 문서는 주로 품질 CI 흐름을 설명하는 파생 가이드다. 워크플로우 단계와 트리거의 정본은 [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml), 릴리스 발행은 [`.github/workflows/release.yml`](../../.github/workflows/release.yml), required context는 [`.github/required-checks.json`](../../.github/required-checks.json), 로컬 훅은 [`.githooks/README.md`](../../.githooks/README.md)가 소유한다. 과거 실행 통계로 현재 상태를 추정하지 않고 대상 커밋의 required checks를 직접 확인한다.

---

## 📋 목차

1. [워크플로우 개요](#워크플로우-개요)
2. [백엔드 빌드](#백엔드-빌드)
3. [프론트엔드 빌드](#프론트엔드-빌드)
4. [E2E 테스트](#e2e-테스트)
5. [보안 스캔](#보안-스캔)
6. [캐싱 전략](#캐싱-전략)
7. [로컬 테스트](#로컬-테스트)
8. [릴리스 프런트엔드 런타임 인계](#릴리스-프런트엔드-런타임-인계)
9. [시큐어코딩 정적 분석 (SAST)](#시큐어코딩-정적-분석-sast)

---

## 워크플로우 개요

### 구조

```
push/PR / workflow_dispatch
    │
    └─ change-scope (삭제·rename old path를 포함한 fail-closed 분류)
        ├─ sast-scope (Java·JavaScript/TypeScript CodeQL security-extended)
        │   └─ secure-coding (High/Critical 차단, 언어별 결과 집계)
        ├─ secret-scan (운영 계약·snapshot readiness·PR runtime 의존성 review·비밀 스캔)
        ├─ backend-scope (backend=true인 경우의 실제 무거운 실행)
        │   ├─ Gradle 빌드·테스트·커버리지·OpenAPI 신선도
        │   └─ schema=true일 때만 PostgreSQL schema-validation
        ├─ backend-build (backend-scope를 집계해 항상 완료되는 안정 required context)
        ├─ frontend-scope (frontend=true인 경우의 실제 무거운 실행, backend와 독립)
        │   └─ codegen·lint·audit·Next build·Vitest coverage·bundle budget
        ├─ frontend-build (frontend-scope를 집계해 항상 완료되는 안정 required context)
        ├─ mutation-scope (mutation=true, registry의 PIT 스코프 병렬)
        │   └─ mutation-test (항상 완료되는 안정 required aggregate)
        └─ e2e-tests (e2e=true, backend/frontend 결과 확인 후 내부 2 shard)
            ├─ 실행시간 profile 기반 명시적 spec 분배
            ├─ e2e-merge-reports (비필수 리포트 병합)
            └─ e2e-test (항상 완료되는 안정 required aggregate)
```

Gradle PR 의존성 그래프는 write token으로 PR 코드를 실행하지 않도록 다음 신뢰 경계로 분리한다.

```
dependency-submission.yml (pull_request, contents:read)
    └─ Gradle graph 생성·artifact upload
        └─ dependency-submission-publish.yml (workflow_run, actions:read + contents:write)
            └─ checkout/run 없이 공식 Gradle action으로 artifact 제출
                └─ secret-scan: base/head snapshot을 최대 600초 확인
                    └─ runtime High 이상 신규 의존성 review
```

`workflow_run` publisher는 해당 workflow 파일이 기본 브랜치에 존재한 뒤부터 활성화된다. 따라서 정적 계약 검증만으로 public fork 경로의 운영 집행을 완료로 보지 않으며, 기본 브랜치 반영 후 고위험 runtime 의존성 probe PR로 artifact 제출·readiness·차단을 확인한다. `push`와 `workflow_dispatch`에서는 producer workflow의 trusted job이 그래프를 직접 제출한다.

> **CI와 로컬 피드백의 경계**: pre-commit/pre-push는 빠른 범위별 피드백이며 일부 계약 검사를 선행할 수 있지만 우회 가능하다. required CI 6개가 병합 권위를 소유하며 현재 커밋의 실제 check 상태로 판정한다. `backend-build`·`frontend-build`·`e2e-test`·`mutation-test`·`secure-coding`은 scope가 선택되면 source 성공만, 선택되지 않으면 명시적 skip만 허용하는 안정 aggregate라 docs-only SHA에서도 완료 상태가 남는다.
> - **계약 드리프트 (HARD, CI FAIL)**: `backend-build` 의 `git diff --exit-code api-docs.json`(커밋된 스펙이 실제 DTO/컨트롤러와 어긋나면 실패) 과 `frontend-build` 의 `codegen:verify`/`codegen:verify:zod`(스펙 대비 생성 타입·Zod 미갱신 시 실패).
> - **스키마 무결성 (HARD, CI FAIL)**: classifier가 schema 영향으로 판정하면 `Real PostgreSQL Schema Validation (Testcontainers + Flyway + validate)`이 Flyway 전량 적용 + Hibernate `ddl-auto:validate`로 물리 정합성을 검증한다. `:foundation:test --no-build-cache`를 재실행하는 `Cache-bypass regression gate (foundation, main only)`는 같은 schema 조건에 더해 `refs/heads/main`에서만 실행한다.
> - **프론트엔드 정적 품질 (HARD, CI FAIL)**: ESLint error 0건과 `frontend/package.json`의 warning 상한을 함께 강제한다(`pnpm run lint`). 의존성 감사는 `pnpm audit --json` 단일 조회를 정책 evaluator가 판정해 Critical 전체와 운영 의존성 High를 차단하고, 개발 전용 High는 warning으로 남기며 형식·네트워크 오류는 실패 처리한다.
> - **증분 뮤테이션 (HARD, CI FAIL)**: `mutation-scope`는 10개 PIT 스코프 각각에 `STRICT_MUTATION=true`를 주입해 Mutation Score 75%를 강제한다. `mutation-test`는 매트릭스 전체 결론을 집계하고 required check 이름을 보존한다. 로컬 PIT는 `STRICT_MUTATION` 미설정 시 threshold 0의 리포트 전용이다.
> - **OWASP Dependency-Check 분리**: 기존 의존성 전수 검사는 별도의 주간·수동 워크플로우(`.github/workflows/dependency-check.yml`)가 담당한다. 모듈 리포트 누락은 실패하지만 scan step 자체는 `continue-on-error`라 취약점 outcome은 PR 차단이 아니며, required 증분 review와 같은 강도로 해석하지 않는다.

> **브랜치 보호 SSOT와 live 경계**: `.github/required-checks.json`이 보호·릴리스 기준 브랜치, 안정 required context 6개, 원본 job/matrix, 신뢰할 GitHub Actions integration ID와 review policy 목표를 정의한다. `scripts/verify-branch-protection.mjs`는 required check·strict/provider/bypass뿐 아니라 approval 수, code-owner, last-push, stale review, thread resolution을 live ruleset과 exact-match한다. 저장소 명세가 바뀌어도 원격 설정은 자동 변경되지 않으므로 `verify:ops`가 green이기 전에는 적용 완료로 보지 않는다. 현재 외부 drift는 [공용 gap 인덱스](../../.agent/memory/known-gaps.md)를 따른다.

### 실행 트리거

- **Push**: `main`, `master` 브랜치
- **Pull Request**: base 브랜치 제한 없이 모든 PR
- **Workflow Dispatch**: GitHub UI / CLI 에서 수동 실행 지원 (`workflow_dispatch`)
- **Concurrency**: 동일 ref 연속 푸시 시 이전 실행 자동 중단 (`concurrency: group: ci-${{ github.ref }}, cancel-in-progress: true`)

---

## 백엔드 빌드

### Gradle 설정

`backend-scope`는 JDK 21과 `gradle/actions/setup-gradle`을 사용하며 action 참조는 workflow의 검증된 commit SHA로 고정한다. 캐시 옵션과 wrapper 다운로드 재시도는 [ci.yml](../../.github/workflows/ci.yml)의 `Setup Gradle`·`Provision Gradle distribution with bounded retry` 단계가 정본이다.

### 실행 명령어

```bash
# 1. main에서 classifier가 schema 영향으로 판정했을 때만 cache-bypass 재실행
./gradlew :foundation:test --no-build-cache

# 2. 메인 빌드 및 테스트 (OpenAPI Spec 정적 추출 포함)
./gradlew build jacocoRootCoverageVerification check \
  -Dopenapi.export.path=api-docs.json --warning-mode fail

# 3. 물리 PostgreSQL 17 스키마 실측 검증 (Testcontainers + Flyway + Hibernate validate)
./gradlew :api-server:schemaValidationTest

# 4. 계약 드리프트 검증 (백엔드 스펙 신선도 확인)
git diff --exit-code api-docs.json
```

### 생성 아티팩트

| 이름 | 경로 |
|------|------|
| `openapi-spec` | `api-docs.json` |
| `jacoco-report` | `build/reports/jacoco/aggregated` |
| `openapi-spec-changed` | `api-docs.json` (변경 감지 시) |

업로드 조건과 보존 기간은 현재 workflow가 정본이다.

---

## 프론트엔드 빌드

### Node.js 설정

Node 버전은 workflow의 `NODE_VERSION`, pnpm은 `version: 9`를 사용한다. `pnpm/action-setup`·`actions/setup-node`의 정확한 commit SHA와 캐시 옵션은 [ci.yml](../../.github/workflows/ci.yml)의 `frontend-scope`를 따른다. pnpm 캐시는 `frontend/pnpm-lock.yaml`에 결속한다.

### 실행 명령어

```bash
cd frontend
pnpm install --frozen-lockfile
pnpm run test:form-validation # 폼 census·검증 계약과 red proof
pnpm run codegen:verify        # 계약 드리프트 게이트 (spec ↔ 생성 타입)
pnpm run codegen:verify:zod    # 계약 드리프트 게이트 (spec ↔ Zod)
pnpm run type-check:e2e        # Next build가 제외하는 E2E 타입
pnpm run lint                  # ESLint error 규칙 0건 게이트
node ../scripts/frontend-audit-policy.mjs # pnpm audit JSON 단일 조회·정책 판정
pnpm run build
pnpm run bundle:check
pnpm run test:coverage
```

프론트 의존성 감사 정책은 다음과 같다.

| 결과 | CI 판정 |
|---|---|
| Critical advisory | 운영/개발 구분 없이 차단 |
| High + 운영 의존성 | 차단 |
| High + 개발 전용 의존성 | GitHub warning, 비차단 |
| JSON 형식·severity/count 불일치, 실행/네트워크 오류 | fail-closed |

### 생성 아티팩트

`frontend-scope`는 `next-build-cache` artifact를 업로드하지 않는다. 해당 업로드는 소비자가 없고 유효한 빌드 재사용 효과도 없어 2026-09-01 제거됐다. Next production build·bundle budget·Vitest coverage 결과는 각 실행 로그에서 확인한다.

---

## E2E 테스트

### Playwright Sharding

`1/2`·`2/2`은 내부 실행 job label이다. 브랜치 보호에는 shard 개수와 무관한 안정 context `e2e-test` 하나만 노출한다. 실제 spec 배정은 Playwright의 개수 기반 `--shard`가 아니라 [실행시간 profile](../../frontend/e2e/shard-duration-profile.json)을 [planner](../../scripts/e2e-shard-plan.mjs)가 LPT 방식으로 균형 분배한다. 새·삭제 spec, 잘못된 source 증거, 누락·중복 또는 15% 초과 예상 편차는 운영 계약이 실패 처리한다.

```yaml
strategy:
  fail-fast: false
  matrix:
    shard: [1/2, 2/2]
```

### 실행 흐름

1. **API 이미지 빌드와 Docker Compose 시작**
   ```bash
   docker compose build api
   docker compose up -d db api
   ```

2. **백엔드 헬스 체크**
   ```bash
   # CI 호스트 레벨에서 백엔드 포트(8080)가 열릴 때까지 우아하게 차단 대기
   pnpm exec wait-on tcp:8080
   ```

3. **Playwright 테스트 실행**
   ```bash
   cd frontend
   pnpm run build
   pnpm run start:3001 &
   pnpm exec wait-on http://127.0.0.1:3001/login
   mapfile -t E2E_SPECS < <(node ../scripts/e2e-shard-plan.mjs --shard 1/2)
   export PLAYWRIGHT_JSON_OUTPUT_FILE=/tmp/e2e-results.json
   pnpm exec playwright test --project=full-suite "${E2E_SPECS[@]}" --reporter=blob,line,json
   node ../scripts/playwright-result-contract.mjs --report "$PLAYWRIGHT_JSON_OUTPUT_FILE" "${E2E_SPECS[@]}"
   ```

### 리포트 병합

- **스펙 구성**: planner의 재귀 spec discovery와 duration profile exact census가 현재 실행 모집단의 정본이다. 계층 정의는 [testing-guide.md](./testing-guide.md) §E2E를 따른다.
- **Playwright projects 는 2개다**: `setup`(`*.setup.ts`)과 `full-suite`(`*.spec.ts`, `dependencies: [setup]`). 스펙 파일 수와 Playwright project 수를 혼동하지 않고, 현재 값은 `frontend/playwright.config.ts`에서 확인한다.
- **Sharding (병렬 실행)**: 내부 2개 job은 비용 병렬화를 위한 구현 세부사항이고 required context는 `e2e-test` 하나다. spec별 최근 성공 실행시간이 바뀌면 profile의 source 증거와 `durationsMs`를 함께 갱신한다. 단순 파일 수 균등이나 수동 목록은 사용하지 않는다.

#### 병합 리포트 생성 (`ci.yml`)

병렬 VM 간 파일 시스템은 격리되어 있으므로 각 shard의 blob을 업로드한 뒤 `e2e-merge-reports`에서 내려받아 병합한다. 정확한 action SHA와 shell은 [ci.yml](../../.github/workflows/ci.yml)이 소유한다.

| 단계 | 현재 계약 |
|---|---|
| Shard 업로드 | `frontend/blob-report/` → `playwright-report-shard-${{ strategy.job-index }}`, 30일 보존. slash가 있는 `matrix.shard`를 artifact 이름에 쓰지 않는다. |
| 다운로드 | `playwright-report-shard-*`를 `frontend/playwright-reports`의 shard별 디렉터리로 받는다. `merge-multiple: true`를 사용하지 않는다. |
| 평탄화·병합 | shard 접두사를 붙여 파일명 충돌을 피한 뒤 `playwright merge-reports --reporter html ./playwright-reports` 실행 |
| 최종 업로드 | `frontend/playwright-report` → `playwright-report-merged`, 30일 보존 |

E2E JSON 결과는 [playwright-result-contract.mjs](../../scripts/playwright-result-contract.mjs)가 배정된 spec의 실제 실행을 확인한다. HTML 병합은 비필수 보조 job이며, E2E 성공 권위는 `e2e-tests`와 required `e2e-test`에 남는다.

---

## 보안 스캔

### PR 증분 의존성 검사

| 통제 | 트리거·경로 | 집행 의미 |
|---|---|---|
| Gradle dependency graph | PR read-only producer → trusted `workflow_run` publisher | write token을 가진 job은 PR 코드를 checkout하거나 실행하지 않는다. |
| Snapshot readiness | `secret-scan`, backend/frontend 영향 PR | GitHub compare API의 base/head snapshot warning이 사라질 때까지 최대 600초 기다리고, 미완전·비재시도 API 오류·시간 초과를 실패 처리한다. 실패 시 **어느 쪽 SHA가 비었는지 분류하고 해소 명령을 함께 출력**한다. |
| Dependency review | readiness 성공 뒤 `actions/dependency-review-action` | 새 runtime 의존성의 High 이상을 required `secret-scan`에서 차단한다. |
| Frontend audit policy | `frontend-scope` | lockfile을 한 번 조회해 Critical 전체·운영 High를 차단하고 개발 High만 warning으로 남긴다. |

#### 스냅샷이 없을 때 무엇을 해야 하는가

`dependency-review-action`은 단독으로는 이 축을 막지 못한다 — retry timeout이 지나면 `Retry timeout exceeded. Proceeding...`을 찍고 **실패하지 않고 진행한다**. 그래서 fail-closed 판정은 앞 단계의 readiness 스크립트가 전담한다.

readiness가 실패하면 로그에 축과 해소 절차가 함께 나온다. 두 축은 대응이 다르다.

| 축 | 경고 형태 | 기다리면 해소되나 | 해소 |
|---|---|---|---|
| base(main) 부재 | `The number of snapshots compared for the base SHA (0) and the head SHA (1) do not match.` | **아니오** | `gh workflow run dependency-submission.yml --ref main` 뒤 `secret-scan` 재실행 |
| head(PR) 부재 | `No snapshots were found for the head SHA <sha>.` 또는 base(1)/head(0) count 형태 | PR 직후 2분 이내는 정상. 제한 시간까지 남으면 **아니오** | producer 실행 상태를 조회해 원인별로 승인·재실행·재push |

> ⚠ head 부재를 **PR 브랜치 dispatch**로 해소하지 않는다. `submit-trusted-snapshot`은 `contents: write`로 지정한 ref의 Gradle 빌드를 실행하므로, PR 브랜치를 지정하면 "write 토큰 잡은 PR 코드를 실행하지 않는다"는 이 설계의 신뢰 경계가 깨진다. 그 경계는 2026-08-29부터 `github.ref == 'refs/heads/main'` 가드로 집행되며 계약이 양방향 동결한다.

head 부재의 하위 원인(producer 미실행·빌드 실패·concurrency 취소·fork 승인 대기·publisher 실패·artifact 만료)은 **전부 같은 경고 문자열**을 내므로 문자열만으로 갈리지 않는다. 스크립트가 원인을 단정하지 않고 조회 명령을 안내하는 이유이며, 조회에 필요한 `actions: read`를 `secret-scan`에 부여하지 않은 것은 그 잡이 PR 코드를 실행하기 때문이다.

구성의 회귀 방지는 [`dependency-submission-contract.mjs`](../../scripts/dependency-submission-contract.mjs)와 운영 계약 catalog가 담당한다. public fork에서의 live 증거가 확보되기 전 상태는 [GAP-DEP-001](../../.agent/memory/known-gaps.md)에서 추적한다.

### OWASP Dependency-Check (주간·수동 전수 스캔)

기존 의존성 전수 CVE 검사는 주간·수동 워크플로우(`.github/workflows/dependency-check.yml`)로 분리돼 있다. Gradle 설정의 `failBuildOnCVSS = 7`과 달리 workflow의 scan step은 외부 NVD 가용성을 고려해 `continue-on-error`이며 PR required check가 아니다. 단, 애플리케이션 모듈 리포트가 생성되지 않은 실행은 후속 검증 단계가 실패한다. 이 outcome 차이와 대응 SLA는 GAP-DEP-001의 별도 정책 정렬 과제다.

#### 설정 (`build.gradle`)

```groovy
dependencyCheck {
    failBuildOnCVSS = 7  // High 이상만 실패
    skipConfigurations = [
        'compileOnly',
        'testCompileOnly',
        'annotationProcessor',
        'testAnnotationProcessor'
    ]
    formats = ['HTML', 'JUNIT']
    suppressionFile = file('config/dependency-check/suppressions.xml').absolutePath
}
```

#### Suppression 규칙

테스트 전용 의존성 및 알려진 오탐 제외:

```xml
<!-- PostgreSQL (Testcontainers) -->
<suppress>
    <notes>Testcontainers is only used for integration testing</notes>
    <packageUrl regex="true">^pkg:maven/org\.testcontainers/.*$</packageUrl>
    <vulnerabilityName>.*</vulnerabilityName>
</suppress>

<!-- H2 (Unit Testing) -->
<suppress>
    <notes>H2 is only used for local unit testing</notes>
    <packageUrl regex="true">^pkg:maven/com\.h2database/h2@.*$</packageUrl>
    <vulnerabilityName>.*</vulnerabilityName>
</suppress>
```

#### 로컬 실행

```bash
./gradlew dependencyCheckAnalyze --info
```

리포트: `build/reports/dependency-check-report.html`

---

## 캐싱 전략

### Gradle 캐싱

- **위치**: GitHub Actions 캐시 + 로컬 `.gradle`
- **키·입력**: `setup-gradle` action의 캐시 구성과 Gradle task 입력 계약을 따른다. wrapper·build 파일 두 개만으로 전체 캐시 키를 설명하지 않는다.
- **효과 확인**: 캐시 hit 여부와 실행 시간은 대상 workflow run에서 확인한다. 과거 측정치를 현재 성능 보장으로 사용하지 않는다.

### Next.js 캐싱 — E2E에서는 사용하지 않는다

E2E job은 회차별 JWT 환경과 일치하는 프론트엔드를 클린 빌드한다. 빌드 시점 환경값이 번들에 포함될 수 있으므로 다른 실행에서 만든 Next build cache를 E2E에 복원하지 않는다.

- **Gradle·Playwright 브라우저 캐시는 유지**한다(아래 참조). 캐시 복원을 다시 도입하려면 시크릿이 번들에 인라인되지 않음을 먼저 증명할 것.

### Playwright 브라우저

- **위치**: `/tmp/playwright-browsers`
- **키**: `runner.os-playwright-{pnpm-lock.yaml 해시}`
- **효과**: 매번 설치하지 않고 재사용

---

## 로컬 테스트

### 전체 파이프라인 시뮬레이션

```bash
# Docker를 포함한 병합 전 로컬 게이트
./gradlew localGate

# 브라우저 E2E가 필요한 변경은 격리 환경에서 별도 실행
docker compose up -d db api
pnpm -C frontend test:e2e:full
```

주간 Dependency-Check나 release workflow를 위 명령이 대신하지 않는다. 필요한 검증은 변경 범위와 대상 workflow를 기준으로 추가한다.

> [!TIP]
> **외부 격리 DB 직접 연동 시**
> Docker 대신 외부 개발 DB를 사용한다면 운영·공유 데이터가 아닌 E2E 전용 환경인지, 테스트 계정과 cleanup 접두사가 격리됐는지 먼저 확인한다. 운영 자격증명으로 E2E를 실행하지 않는다.
> 
> ```bash
> # 백엔드·프론트가 명시한 격리 환경을 가리키는지 확인한 뒤
> pnpm -C frontend test:e2e:full
> ```

### JaCoCo 커버리지 확인

```bash
./gradlew jacocoRootReport
open build/reports/jacoco/aggregated/index.html
```

임계값 검증은 `./gradlew jacocoRootCoverageVerification`, 해석과 문제 해결은 [커버리지 워크플로](../../.agent/workflows/coverage.md)를 따른다.

### Playwright 리포트

```bash
pnpm -C frontend exec playwright test --reporter=html
pnpm -C frontend exec playwright show-report
```

### 로컬 사전 게이트 (git hooks)

CI가 실행되기 전, 저장소에 포함된 공유 pre-push 게이트가 잘못된 푸시를 먼저 차단합니다. 범위별 최소 검증은 [AGENTS.md](../../AGENTS.md#verification-by-change-scope)를 따르며, 최종 병합 권위는 required CI입니다.

```bash
# 클론마다 1회 설치
git config core.hooksPath .githooks
```

- **pre-push (차단)**: 변경 범위를 판정해 문서 계약 또는 소스 컴파일·타입·codegen·하네스 검증을 실행한다. 실제 명령 집합은 훅과 `.githooks/README.md`를 따른다.
- **pre-commit**: DTO/Controller/api-docs.json/생성 타입의 codegen 드리프트는 경고한다. 별도로 gitleaks가 설치되어 있으면 staged 시크릿 탐지는 커밋을 차단하고, 미설치면 스캔 생략 경고를 출력한다.
- **우회**: `git push --no-verify` 또는 `SKIP_HOOKS=1 git push`.

자세한 내용은 [.githooks/README.md](../../.githooks/README.md) 참조.

---

## 릴리스 프런트엔드 런타임 인계

`release.yml`은 frontend image를 build/push할 뿐 배포하지 않는다. build step의 repository variables는 Next production build를 검증하기 위한 입력이고, 발행된 image를 어느 backend에 연결할지는 runtime deploy owner가 별도로 인계해야 한다. build arguments가 container runtime environment를 대신한다고 간주하지 않는다.

<!-- FRONTEND_RELEASE_RUNTIME_API_HANDOFF -->

```yaml
releaseRuntimeContract:
  publisher: image-only
  requiredEnvironment: [BACKEND_API_URL, NEXT_PUBLIC_API_URL]
  buildArgsSubstituteRuntimeEnvironment: false
  evidenceValuePolicy: names-and-validation-only
```

- `BACKEND_API_URL`: absolute http(s) URL ending `/api/v1` 또는 `/api/v1/`.
- `NEXT_PUBLIC_API_URL`: absolute http(s) URL ending `/api/v1` 또는 `/api/v1/`.
- 두 값 모두 credential, query, fragment, 제어문자와 상대 URL을 허용하지 않는다.
- 배포 manifest/secret provider는 두 이름을 container runtime에 명시적으로 주입한다. endpoint는 자격증명은 아니지만 내부 topology일 수 있으므로 release handoff evidence에는 raw value를 복제하지 않고 image digest, 변수 이름 2개, validator 성공 여부와 bounded health category만 남긴다.
- 누락·형식 오류는 fallback URL로 발행을 계속하지 않고 배포 preflight를 실패시킨다. 저장소의 기본/e2e Compose는 같은 계약을 정적으로 검증하지만 별도 Kubernetes·PaaS·`docker run` 배포는 인수처 manifest와 secure channel에서 이 인계를 증명해야 한다.

---

## 문제 해결

### Gradle 캐시 미스

**증상**: 매번 전체 빌드 실행

**해결**: 먼저 `--info` 로그에서 입력 해시·Gradle/JDK 버전·cache key를 확인한다. 재현 확인이 필요하면 `./gradlew clean <task> --no-build-cache`로 한 번 비교한다. 저장소·사용자 캐시 디렉터리 삭제는 기본 해결 절차가 아니며, 정확한 대상과 복구 비용을 확인한 뒤 수행한다.

### Playwright 브라우저 설치 실패

**증상**: `Executable doesn't exist`

**해결**:
```bash
pnpm -C frontend exec playwright install --with-deps chromium
```

### OWASP 스캔 타임아웃

**증상**: NVD 데이터베이스 다운로드超时

**해결**:
```bash
# NVD API 키 설정 (선택사항)
export NVD_API_KEY=your-key
./gradlew dependencyCheckAnalyze
```

---

## 관련 문서

- [테스트 종합 가이드](./testing-guide.md)
- [E2E 테스트 운영 런북](./e2e-test-guide.md)
- [API 문서화 가이드](./api-documentation-guide.md)

*Last reviewed against current sources: 2026-09-10.*


## 시큐어코딩 정적 분석 (SAST)

[`sast-policy.json`](../../config/security/sast-policy.json)이 CodeQL 버전·보안 점수 임계값·언어를 정의한다. Java는 5개 모듈의 production `compileJava`를 캐시 없이 추적하여 Lombok 생성 코드까지 분석한다. JavaScript/TypeScript는 [`codeql.yml`](../../config/security/codeql.yml)의 프론트엔드와 운영 스크립트 경로를 분석한다. `security-extended`는 기본 보안 쿼리와 추가 보안 쿼리를 포함한다([GitHub 공식 설명](https://docs.github.com/en/code-security/reference/code-scanning/workflow-configuration-options)).

- 코드·설정 변경에서는 전체 대상 소스를 분석하며, 명시적인 문서 전용 변경만 생략한다. 분류 실패·언어 누락·분석 실패는 통과로 처리하지 않는다.
- 보안 점수 7.0 이상(High/Critical)은 기존·신규 여부와 관계없이 실패시킨다. [승인된 오탐 7건](../04-operations/sast-findings-review.md)만 정확한 위치·fingerprint·소스/방어 해시·만료일에 묶어 예외로 처리한다. 그 미만의 탐지도 리포트에 남긴다. 리포트 누락·잘못된 버전·빈 쿼리 집합·실행 오류·예외 건수 불일치는 별도 오류로 실패한다.
- 두 언어의 실제 취약/안전 fixture를 CodeQL로 분석하고, 취약 fixture가 동일 정책 CLI에서 종료 코드 1을 내는지 매 CI에서 확인한다. fixture의 취약 동작은 실행하지 않는다.
- `secure-coding`은 여섯 번째 required context다. 기존 release workflow가 같은 manifest를 읽으므로 대상 SHA에 이 체크가 성공하지 않으면 이미지·릴리스 발행을 차단한다. 원격 ruleset 적용 여부는 `npm run verify:ops`로 별도 확인한다.
- 코드 snippet·전체 파일 내용·소스에서 유래한 메시지를 제거한 SARIF를 사용한다. 14일 보존 감사 artifact에는 예외 ID·사유·만료일과 전체 탐지를 남기고, GitHub Security 게시본에서는 승인된 개별 탐지만 제외한다. 원본 CodeQL DB는 업로드하지 않는다. 분석에 앱·OCI 자격증명은 필요하지 않다.
- SAST는 SQL/명령 주입·경로 조작·XSS·위험한 암호 사용 등 코드 패턴과 데이터 흐름을 검사한다. 업무별 권한 의미, 배포 설정, 실제 공격 가능성을 전부 증명하지 않으므로 기존 인증·인가 하네스와 E2E를 함께 유지한다.

로컬에서는 정책에 고정된 CodeQL bundle을 설치하고 `CODEQL_PATH`에 실행 파일의 절대경로를 지정한다. 공식 bundle checksum을 확인한 뒤 다음을 실행한다. Java 분석에는 JDK 21이 필요하다.

```powershell
$env:CODEQL_PATH = 'C:/tools/codeql/codeql.exe'
npm run test:sast
npm run verify:sast -- java
npm run verify:sast -- javascript
npm run verify:sast:probe -- java
npm run verify:sast:probe -- javascript
```

로컬 분석 로그·원본 리포트는 Git에서 제외된 `build/sast-*`에 보관한다. 실패한 탐지는 rule ID·파일·행·데이터 흐름을 확인해 수정하고 재분석한다. 규칙 비활성화, 파일 전체 제외, `continue-on-error`, 임계값 상향으로 red를 감추지 않는다.
