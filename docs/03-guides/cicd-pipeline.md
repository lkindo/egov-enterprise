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

---

## 워크플로우 개요

### 구조

```
push/PR / workflow_dispatch
    │
    └─ backend-build (Ubuntu, timeout 75분, concurrency 중복취소)
        ├─ Strict Schema Integrity Validation (엔티티/마이그레이션 변경 시, --no-build-cache)
        ├─ Gradle 빌드·테스트·커버리지 래칫 (build jacocoRootCoverageVerification check)
        ├─ Pre-pull postgres:17 & Real PostgreSQL Schema Validation (Testcontainers + Flyway + validate)
        ├─ api-docs.json 신선도 게이트 (git diff --exit-code → 계약 드리프트 시 FAIL)
        └─ JaCoCo 커버리지 업로드
        │
        ├─ frontend-build (needs: backend-build)
        │   ├─ pnpm install --frozen-lockfile
        │   ├─ codegen:verify / codegen:verify:zod (계약 드리프트 게이트 → 불일치 시 FAIL)
        │   ├─ Lint (ESLint, error 0건 하드게이트)
        │   ├─ Security Audit (critical — blocking / high — advisory)
        │   ├─ Next.js 빌드 및 Vitest 단위 테스트
        │   └─ Next.js build cache 업로드
        │
        ├─ mutation-scope (needs: backend-build, 10개 스코프 병렬)
        │   └─ 증분 PIT (STRICT_MUTATION=true, Mutation Score 75% HARD 게이트)
        ├─ mutation-test (needs: mutation-scope)
        │   └─ 매트릭스 전체 결과 집계 + required check 이름 보존
        │
        └─ e2e-tests (needs: backend-build + frontend-build, 3 shard 병렬)
            ├─ Docker Compose (DB + API)
            ├─ Playwright 테스트
            └─ e2e-merge-reports (needs: e2e-tests) — Shard 리포트 병합
```

> **CI와 로컬 피드백의 경계**: pre-commit/pre-push는 빠른 범위별 피드백이며 일부 계약 검사를 선행할 수 있지만 우회 가능하다. 아래 required CI가 병합 권위를 소유하며 현재 커밋의 실제 check 상태로 판정한다.
> - **계약 드리프트 (HARD, CI FAIL)**: `backend-build` 의 `git diff --exit-code api-docs.json`(커밋된 스펙이 실제 DTO/컨트롤러와 어긋나면 실패) 과 `frontend-build` 의 `codegen:verify`/`codegen:verify:zod`(스펙 대비 생성 타입·Zod 미갱신 시 실패).
> - **스키마 무결성 (HARD, CI FAIL)**: 엔티티/마이그레이션 변경 감지 시 `Strict Schema Integrity Validation` 이 `--no-build-cache` 로 `:foundation:test` 를 강제 실행하며, Testcontainers 기반 `Real PostgreSQL 17 Schema Validation` 이 Flyway 전량 적용 + Hibernate `ddl-auto:validate` 로 물리 스키마 정합성을 검증.
> - **프론트엔드 정적 품질 (HARD, CI FAIL)**: ESLint error 규칙 0건 유지(`pnpm run lint`) 및 `pnpm audit --audit-level critical` 차단.
> - **증분 뮤테이션 (HARD, CI FAIL)**: `mutation-scope`는 10개 PIT 스코프 각각에 `STRICT_MUTATION=true`를 주입해 Mutation Score 75%를 강제한다. `mutation-test`는 매트릭스 전체 결론을 집계하고 required check 이름을 보존한다. 로컬 PIT는 `STRICT_MUTATION` 미설정 시 threshold 0의 리포트 전용이다.
> - **OWASP Dependency-Check 분리**: 매 푸시 파이프라인 병목 방지를 위해 별도의 주간 스케줄 워크플로우(`.github/workflows/dependency-check.yml`)로 분리 운용 중.

> **브랜치 보호 SSOT와 한계**: `.github/required-checks.json`이 보호·릴리스 기준 브랜치와 exact required context, 원본 job/matrix 매핑, 신뢰할 GitHub Actions integration ID를 정의한다. `scripts/verify-branch-protection.mjs`는 이 명세와 live ruleset의 required check·strict/provider/bypass 정합을 확인한다. 현재 verifier와 manifest는 approval 수, code-owner, last-push, stale review, thread resolution 정책을 exact-match하지 않으므로 그 항목까지 보호됐다는 증거로 사용하지 않는다. 외부 상태와 개선안은 [공용 gap 인덱스](../../.agent/memory/known-gaps.md)를 따른다.

### 실행 트리거

- **Push**: `main`, `master`, `feature/**` 브랜치
- **Pull Request**: base 브랜치 제한 없이 모든 PR
- **Workflow Dispatch**: GitHub UI / CLI 에서 수동 실행 지원 (`workflow_dispatch`)
- **Concurrency**: 동일 ref 연속 푸시 시 이전 실행 자동 중단 (`concurrency: group: ci-${{ github.ref }}, cancel-in-progress: true`)

---

## 백엔드 빌드

### Gradle 설정

```yaml
- name: Setup Gradle
  uses: gradle/actions/setup-gradle@v3
  with:
    cache-disabled: false
    cache-read-only: false
    cache-overwrite-existing: false
```

### 실행 명령어

```bash
# 1. 스키마/엔티티 변경 감지 시 (dorny/paths-filter)
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

```yaml
- name: Set up pnpm
  uses: pnpm/action-setup@v4
  with:
    version: 9

- name: Set up Node.js
  uses: actions/setup-node@v4
  with:
    node-version: ${{ env.NODE_VERSION }}
    cache: "pnpm"
    cache-dependency-path: frontend/pnpm-lock.yaml
```

### 실행 명령어

```bash
cd frontend
pnpm install --frozen-lockfile
pnpm run codegen:verify        # 계약 드리프트 게이트 (spec ↔ 생성 타입)
pnpm run codegen:verify:zod    # 계약 드리프트 게이트 (spec ↔ Zod)
pnpm run lint                  # ESLint error 규칙 0건 게이트
pnpm audit --audit-level critical # 보안 감사 (critical 차단)
pnpm audit --audit-level high # 보안 감사 (high 권고, advisory)
pnpm run build
pnpm run test
```

### 생성 아티팩트

| 이름 | 경로 | 보존 기간 |
|------|------|-----------|
| `next-build-cache` | `frontend/.next/cache` | 7 일 |

---

## E2E 테스트

### Playwright Sharding

3 개의 shard 로 분할하여 병렬 실행:

```yaml
strategy:
  fail-fast: false
  matrix:
    shard: [1/3, 2/3, 3/3]
```

### 실행 흐름

1. **Docker Compose 시작**
   ```bash
   docker-compose up -d db api
   ```

2. **백엔드 헬스 체크**
   ```bash
   # CI 호스트 레벨에서 백엔드 포트(8080)가 열릴 때까지 우아하게 차단 대기
   pnpm exec wait-on tcp:8080
   ```

3. **Playwright 테스트 실행**
   ```bash
   cd frontend
   pnpm run dev -- -p 3001 &
   pnpm exec wait-on http://127.0.0.1:3001/login
   pnpm exec playwright test --shard=1/3
   ```

### 리포트 병합

- **스펙 구성**: `01-core-base` ~ `25-deptjob-workreport-journey` 26개 스펙 파일로 테스트가 정의되어 있다(계층 정의의 SSOT는 [testing-guide.md](./testing-guide.md) §E2E).
- **Playwright projects 는 2개다**: `setup`(`*.setup.ts`)과 `full-suite`(`*.spec.ts`, `dependencies: [setup]`). 스펙 파일 수와 Playwright project 수를 혼동하지 않고, 현재 값은 `frontend/playwright.config.ts`에서 확인한다.
- **Sharding (병렬 실행)**: CI 환경에서 전체 테스트 스위트를 3개의 Shard로 분할하여 병렬로 실행함으로써 전체 테스트 시간을 단축합니다.

#### 병합 리포트 생성 (`ci.yml`)

병렬 VM 간 파일 시스템은 격리되어 있으므로, 반드시 각 Shard에서 리포트 파편을 업로드한 후 Merge Job에서 다운로드하여 병합해야 합니다.

```yaml
# 1. 각 Shard Job 마지막에 실행 (matrix.shard 별로 리포트 업로드)
- name: Upload Playwright Report
  uses: actions/upload-artifact@v4
  if: always()
  with:
    name: playwright-report-shard-${{ matrix.shard }}
    path: frontend/playwright-report/
    retention-days: 30
    include-hidden-files: true

# 2. 독립된 Merge Job에서 실행
- name: Download all reports
  uses: actions/download-artifact@v4
  with:
    path: frontend/playwright-reports
    pattern: playwright-report-shard-*
    merge-multiple: true

- name: Merge reports
  run: |
    pnpm exec playwright merge-reports --reporter html ./playwright-reports
  working-directory: frontend
```

---

## 보안 스캔

### OWASP Dependency-Check (분리 워크플로우)

매 Commit 푸시 빌드의 타임아웃/병목 방지를 위해 OWASP 취약점 스캔은 주간 정기 스케줄 워크플로우(`.github/workflows/dependency-check.yml`)로 분리 운용 중입니다.

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
- **키**: Gradle 래퍼 해시 + `build.gradle` 해시
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
- **pre-commit (⚠ 경고, 비차단)**: DTO/Controller/api-docs.json/생성 타입 스테이징 시 codegen 드리프트 점검.
- **우회**: `git push --no-verify` 또는 `SKIP_HOOKS=1 git push`.

자세한 내용은 [.githooks/README.md](../../.githooks/README.md) 참조.

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

*Last reviewed against current sources: 2026-08-19.*
