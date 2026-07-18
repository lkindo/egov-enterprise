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
push/PR
    │
    └─ backend-build (Ubuntu)
        ├─ Gradle 빌드 및 테스트 (build jacocoRootReport check)
        ├─ Strict Schema Integrity Validation (엔티티/마이그레이션 변경 시, --no-build-cache)
        ├─ api-docs.json 신선도 게이트 (git diff --exit-code → 계약 드리프트 시 FAIL)
        ├─ OWASP Dependency-Check
        └─ JaCoCo 커버리지
        │
        ├─ frontend-build (needs: backend-build)
        │   ├─ npm ci
        │   ├─ codegen:verify / codegen:verify:zod (계약 드리프트 게이트 → 불일치 시 FAIL)
        │   ├─ Next.js 빌드
        │   └─ 단위 테스트
        │
        ├─ mutation-test (needs: backend-build)
        │   └─ 증분 PIT (business-core / business-app, report-only: STRICT_MUTATION=false)
        │
        └─ e2e-tests (needs: backend-build + frontend-build, 3 shard 병렬)
            ├─ Docker Compose (DB + API)
            ├─ Playwright 테스트
            └─ e2e-merge-reports (needs: e2e-tests) — Shard 리포트 병합
```

> **CI 전용 게이트 (로컬 pre-commit 과 구분)**: CI 는 로컬 훅에 없는 **드리프트/무결성 게이트**를 추가로 강제한다.
> - **계약 드리프트 (HARD, CI FAIL)**: `backend-build` 의 `git diff --exit-code api-docs.json`(커밋된 스펙이 실제 DTO/컨트롤러와 어긋나면 실패) 과 `frontend-build` 의 `codegen:verify`/`codegen:verify:zod`(스펙 대비 생성 타입·Zod 미갱신 시 실패).
> - **스키마 무결성 (HARD, CI FAIL)**: 엔티티/마이그레이션 변경이 감지되면 `Strict Schema Integrity Validation` 이 `--no-build-cache` 로 `:foundation:test` 를 강제 실행.
> - **증분 뮤테이션 (report-only)**: `mutation-test` 잡은 현재 `STRICT_MUTATION=false`(mutationThreshold=0) 로 **리포트만 산출하며 CI 를 실패시키지 않는다**. 대상 클래스가 85% 를 달성하면 `STRICT_MUTATION=true` 로 전환해 게이트화한다. (백엔드 헌법 제16조)
>
> 반면 로컬 `.githooks/` 의 pre-commit codegen 드리프트 점검은 **경고(⚠, 비차단)** 로, 위 CI 게이트가 최종 방어선이다. (하단 [로컬 사전 게이트](#로컬-사전-게이트-git-hooks) 참조)

### 실행 트리거

- **Push**: `main`, `master`, `feature/**` 브랜치
- **Pull Request**: `main`, `master` 대상

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
./gradlew build jacocoRootReport check -Dopenapi.export.path=api-docs.json
```

### 생성 아티팩트

| 이름 | 경로 | 보존 기간 |
|------|------|-----------|
| `openapi-spec` | `api-docs.json` | 90 일 |
| `owasp-security-report` | `**/build/reports/dependency-check-report.*` | 30 일 |
| `jacoco-report` | `build/reports/jacoco/aggregated` | 30 일 |
| `quality-reports` | `**/build/reports/dependency-check` | 30 일 |

---

## 프론트엔드 빌드

### Node.js 설정

```yaml
- name: Set up Node.js
  uses: actions/setup-node@v4
  with:
    node-version: "20"
    cache: "npm"
    cache-dependency-path: frontend/package-lock.json
```

### 실행 명령어

```bash
cd frontend
npm ci
npm run build
npm run test
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
   npm run dev -- -p 3001 &
   npx wait-on http://127.0.0.1:3001/login
   npx playwright test --shard=1/3
   ```

### 리포트 병합

- **23-Tier 아키텍처**: 01-core-base부터 23-security-auth-supplement까지 총 23개 계층으로 테스트가 정의되어 있으며(계층 정의의 SSOT는 [testing-guide.md](./testing-guide.md) §E2E), 각 티어는 독립적으로 또는 병합되어 실행됩니다.
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

### OWASP Dependency-Check

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

### Next.js 캐싱

- **위치**: `frontend/.next/cache`
- **내용**: Webpack, ESLint, SWC, TypeScript 빌드 정보
- **업로드**: 아티팩트로 업로드하여 E2E 테스트에서 재사용

### Playwright 브라우저

- **위치**: `/tmp/playwright-browsers`
- **키**: `runner.os-playwright-{package-lock.json 해시}`
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
npm ci
npm run build
npm run test

# 4. E2E 테스트 (Docker 필요)
docker-compose up -d db api
npm run test:e2e:full
```

> [!TIP]
> **외부 클라우드 DB (OCI PostgreSQL 등) 직접 연동 시 (로컬 개발 환경)**
> 로컬에서 도커(Docker)를 구동하지 않고 외부 클라우드 DB에 직접 연결하여 백엔드를 띄우고 테스트하는 경우, `docker-compose` 관련 기동 명령어(`docker-compose up -d`)는 실행하지 않고 완전히 생략합니다.
> 
> ```bash
> # 1. 백엔드(8080)와 프론트엔드(3001) 서버가 로컬 OCI DB 환경에서 수동 구동 중인지 확인
> # 2. E2E 테스트만 직접 단독 실행
> cd frontend
> npm run test:e2e:full
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

- **pre-push (❌ 차단)**: `./gradlew compileJava compileTestJava` + `npx tsc --noEmit` — 컴파일/타입 무결성 게이트.
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
