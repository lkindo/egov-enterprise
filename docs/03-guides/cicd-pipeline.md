# CI/CD 파이프라인 가이드

본 프로젝트는 GitHub Actions 를 사용하여 자동화된 CI/CD 파이프라인을 운영합니다.

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
        ├─ Gradle 빌드 및 테스트 (build jacocoRootReport check -Dopenapi.export.path=api-docs.json)
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

> **CI 전용 게이트 (로컬 pre-commit 과 구분)**: CI 는 로컬 훅에 없는 **드리프트/무결성 게이트**를 추가로 강제한다.
> - **계약 드리프트 (HARD, CI FAIL)**: `backend-build` 의 `git diff --exit-code api-docs.json`(커밋된 스펙이 실제 DTO/컨트롤러와 어긋나면 실패) 과 `frontend-build` 의 `codegen:verify`/`codegen:verify:zod`(스펙 대비 생성 타입·Zod 미갱신 시 실패).
> - **스키마 무결성 (HARD, CI FAIL)**: 엔티티/마이그레이션 변경 감지 시 `Strict Schema Integrity Validation` 이 `--no-build-cache` 로 `:foundation:test` 를 강제 실행하며, Testcontainers 기반 `Real PostgreSQL 17 Schema Validation` 이 Flyway 전량 적용 + Hibernate `ddl-auto:validate` 로 물리 스키마 정합성을 검증.
> - **프론트엔드 정적 품질 (HARD, CI FAIL)**: ESLint error 규칙 0건 유지(`pnpm run lint`) 및 `pnpm audit --audit-level critical` 차단.
> - **증분 뮤테이션 (HARD, CI FAIL)**: `mutation-scope`는 10개 PIT 스코프 각각에 `STRICT_MUTATION=true`를 주입해 Mutation Score 75%를 강제한다. `mutation-test`는 매트릭스 전체 결론을 집계하고 required check 이름을 보존한다. 로컬 PIT는 `STRICT_MUTATION` 미설정 시 threshold 0의 리포트 전용이다.
> - **OWASP Dependency-Check 분리**: 매 푸시 파이프라인 병목 방지를 위해 별도의 주간 스케줄 워크플로우(`.github/workflows/dependency-check.yml`)로 분리 운용 중.

> **브랜치 보호 SSOT**: `.github/required-checks.json`이 보호·릴리스 기준 브랜치 `main`, exact required context 7종(`backend-build`, `frontend-build`, `secret-scan`, E2E 3샤드, `mutation-test`), 원본 job/matrix 매핑, 신뢰할 GitHub Actions integration ID를 정의한다. ruleset `12501346`은 이를 strict 모드·provider 고정·bypass actor 0명으로 강제하며, `scripts/verify-branch-protection.mjs`가 default branch·명세·`ci.yml`·GitHub 유효 규칙의 정합성을 검증한다. `e2e-merge-reports`와 개별 `mutation-scope` 체크는 required가 아니며 각각 E2E 샤드와 `mutation-test` 집계 체크가 강제력을 소유한다.

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
./gradlew build jacocoRootReport check -Dopenapi.export.path=api-docs.json

# 3. 물리 PostgreSQL 17 스키마 실측 검증 (Testcontainers + Flyway + Hibernate validate)
./gradlew :api-server:schemaValidationTest

# 4. 계약 드리프트 검증 (백엔드 스펙 신선도 확인)
git diff --exit-code api-docs.json
```

### 생성 아티팩트

| 이름 | 경로 | 보존 기간 |
|------|------|-----------|
| `openapi-spec` | `api-docs.json` | 90 일 |
| `jacoco-report` | `build/reports/jacoco/aggregated` | 30 일 |
| `openapi-spec-changed` | `api-docs.json` (변경 감지 시) | 30 일 |

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
   npx wait-on tcp:8080
   ```

3. **Playwright 테스트 실행**
   ```bash
   cd frontend
   pnpm run dev -- -p 3001 &
   npx wait-on http://127.0.0.1:3001/login
   npx playwright test --shard=1/3
   ```

### 리포트 병합

- **스펙 구성**: `01-core-base` ~ `25-deptjob-workreport-journey` 26개 스펙 파일로 테스트가 정의되어 있다(계층 정의의 SSOT는 [testing-guide.md](./testing-guide.md) §E2E).
- **Playwright projects 는 2개다**: `setup`(`*.setup.ts`)과 `full-suite`(`*.spec.ts`, `dependencies: [setup]`) — `playwright.config.ts:71-82`. ⚠ **종전 서술 "tier 프로젝트 26개"는 2026-08-10 이후 사실이 아니다.** 스펙 파일마다 project 를 두던 구조에서 미지정 실행 시 226건(full-suite 112 + tier 112 + setup 2)이 **2배로 실행**되던 문제가 있어 tier project 26개를 제거했다. 스펙 파일 수(26)와 project 수(2)를 혼동하지 말 것.
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
    npx playwright merge-reports --reporter html ./playwright-reports
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
- **효과**: 2 번째 빌드부터 91% 단축 (2m13s → 12s)

### Next.js 캐싱 — **의도적으로 사용하지 않는다**

⚠ **종전 서술("아티팩트로 업로드하여 E2E 테스트에서 재사용")은 현행이 아니다.** `ci.yml`(E2E 잡)에서 Next 빌드 캐시 복원은 **제거됐다** — 빌드 시점의 dev JWT 시크릿이 Edge 미들웨어 번들에 인라인된 채 캐시에 남아, 회차별로 새로 발급하는 시크릿과 어긋나며 인증이 깨졌기 때문이다. E2E 는 매 회차 클린 빌드한다.

- **Gradle·Playwright 브라우저 캐시는 유지**한다(아래 참조). 캐시 복원을 다시 도입하려면 시크릿이 번들에 인라인되지 않음을 먼저 증명할 것.

### Playwright 브라우저

- **위치**: `/tmp/playwright-browsers`
- **키**: `runner.os-playwright-{pnpm-lock.yaml 해시}`
- **효과**: 매번 설치하지 않고 재사용

---

## 로컬 테스트

### 전체 파이프라인 시뮬레이션

```bash
# 1. 백엔드 빌드 및 테스트
./gradlew clean build

# 2. OWASP 보안 스캔
./gradlew dependencyCheckAnalyze

# 3. 프론트엔드 빌드
cd frontend
pnpm install --frozen-lockfile
pnpm run build
pnpm run test

# 4. E2E 테스트 (Docker 필요)
docker-compose up -d db api
pnpm run test:e2e:full
```

> [!TIP]
> **외부 클라우드 DB (OCI PostgreSQL 등) 직접 연동 시 (로컬 개발 환경)**
> 로컬에서 도커(Docker)를 구동하지 않고 외부 클라우드 DB에 직접 연결하여 백엔드를 띄우고 테스트하는 경우, `docker-compose` 관련 기동 명령어(`docker-compose up -d`)는 실행하지 않고 완전히 생략합니다.
> 
> ```bash
> # 1. 백엔드(8080)와 프론트엔드(3001) 서버가 로컬 OCI DB 환경에서 수동 구동 중인지 확인
> # 2. E2E 테스트만 직접 단독 실행
> cd frontend
> pnpm run test:e2e:full
> ```

### JaCoCo 커버리지 확인

```bash
./gradlew jacocoRootReport
open build/reports/jacoco/aggregated/html/index.html
```

### Playwright 리포트

```bash
cd frontend
npx playwright test --reporter=html
npx playwright show-report
```

### 로컬 사전 게이트 (git hooks)

CI가 실행되기 전, 저장소에 포함된 공유 pre-push HARD 게이트가 잘못된 푸시를 먼저 차단합니다. (`GEMINI.md` §0.6)

```bash
# 클론마다 1회 설치
git config core.hooksPath .githooks
```

- **pre-push (❌ 차단)**: `./gradlew compileJava compileTestJava` + `npx tsc --noEmit` + codegen 드리프트 게이트(`codegen:verify`/`codegen:verify:zod` — api-docs.json ↔ generated-api.d.ts/generated-zod.ts 정합) — 푸시 전 컴파일/타입/계약 무결성 게이트. CI는 별도로 required checks 7종을 실행한다.
- **pre-commit (⚠ 경고, 비차단)**: DTO/Controller/api-docs.json/생성 타입 스테이징 시 codegen 드리프트 점검.
- **우회**: `git push --no-verify` 또는 `SKIP_HOOKS=1 git push`.

자세한 내용은 [.githooks/README.md](../../.githooks/README.md) 참조.

---

## 문제 해결

### Gradle 캐시 미스

**증상**: 매번 전체 빌드 실행

**해결**:
```bash
# 로컬 캐시 초기화
./gradlew clean --no-build-cache
rm -rf .gradle
```

### Playwright 브라우저 설치 실패

**증상**: `Executable doesn't exist`

**해결**:
```bash
cd frontend
npx playwright install --with-deps chromium
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
