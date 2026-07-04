# EGOV Enterprise E2E Testing Guide (v2.0)

> **상위 원칙**: 본 문서는 [테스트 종합 가이드 (testing-guide.md)](./testing-guide.md)의 전략 및 Tier 구조를 상위 규범으로 따르는 **E2E 운영 특화 런북**입니다. 테스트 철학·등급 정의·커버리지 목표는 상위 가이드를 참조하십시오.

본 가이드는 전자정부 프레임워크 현대화 프로젝트의 E2E 테스트 안정성 확보 및 효율적인 데이터 관리를 위한 표준 운영 절차를 제공합니다.

---

## 🛡️ 테스트 작성 및 운영 원칙

### 1. 테스트 작성 전략 (Mocking vs Integration)
- **UI/UX 테스트 (권장)**: 브라우저 동작 및 프론트엔드 로직 검증 시 `page.route`를 이용한 **Mocking**을 기본으로 합니다. (`e2e/user-mock.spec.ts` 참조)
  *   *이유*: 속도가 빠르고 실제 DB에 쓰기 작업이 발생하지 않아 데이터 오염이 없습니다.
- **전체 통합 테스트**: 백엔드와 DB 연동까지 반드시 확인해야 하는 핵심 비즈니스 로직에만 선별적으로 적용합니다.

### 2. 데이터 관리 및 명명 규칙 (Naming Convention)
- **Prefix**: 테스트에서 생성하는 데이터(UserId, 제목 등)는 반드시 `user_test_` 또는 `test_` 접두사를 붙여야 합니다.
- **Cleanup**: 테스트가 종료되면 가능한 한 직접 데이터를 삭제(Teardown)하거나, 아래의 클린업 명령어를 통해 가비지 데이터를 정리합니다.

### 3. 구조적 설계 (POM & Fixtures)
- **Page Object Model (POM)**: 모든 페이지 요소와 동작은 `e2e/pages` 폴더의 클래스로 캡슐화하여 유지보수성을 높입니다.
- **Fixtures**: `e2e/fixtures/base-test.ts`를 상속받아 온보딩 투어 우회 및 공통 객체 주입을 자동화합니다.

---

## 🗄️ E2E 데이터베이스 아키텍처

E2E는 **공유 OCI DB가 아니라, 실행마다 격리된 ephemeral PostgreSQL 17 컨테이너**를 사용한다(샤드별 별도 러너 → 완전 격리, 데이터 경쟁·오염 없음, 빠름, 무비용). OCI PostgreSQL 17은 **운영 DB**이며 e2e 타깃이 아니다.

**동작 방식** (`docker-compose.yml`):
- `db`(postgres:17)가 기동 시 `dump/e2e_full_dump.sql`을 `/docker-entrypoint-initdb.d/`로 실행 → **스키마 + 비-PII 설정데이터 + `webmaster`(admin, pw `1`) 테스트 계정**을 시드한다.
- `api` 컨테이너는 `ddl-auto: none` + `flyway.enabled: false` → 스키마는 오롯이 시드 덤프에서 온다(Hibernate/Flyway가 스키마를 만들지 않음).
- CI e2e(`ci.yml`)는 `docker compose up -d db api`로 이 구조를 그대로 사용한다.

**시드 재생성** (OCI dev 스키마/데이터가 바뀌면):
```bash
# 1) OCI dev DB 를 덤프 (단일라인 INSERT 형식)
pg_dump -h <oci-dev-host> -U egov -d egovdb --inserts --column-inserts > /tmp/oci_dump.sql
# 2) PII 제거 e2e 시드로 변환 (스키마 + 비-PII 설정 + webmaster 만; PII 감사 내장)
scripts/gen-e2e-seed.sh /tmp/oci_dump.sql   # -> dump/e2e_full_dump.sql
```
`scripts/gen-e2e-seed.sh`는 유저·주소록·이메일·SMS·게시글 등 **PII 보유 테이블을 제외**하고, 결과에 이메일/전화/추가 유저가 남으면 **감사 실패로 커밋을 거부**한다.

> ⚠ **주의**: `database/dumps/`(gitignore된 실 덤프)에는 개인정보·비밀번호 해시가 있으므로 절대 그대로 커밋하지 않는다. e2e 시드는 반드시 위 스크립트로 정제한 `dump/e2e_full_dump.sql`만 사용한다.

---

## 🚀 실행 환경 최적화

### 1. 좀비 프로세스 정리
윈도우 환경에서 반복 실행 시 `node.exe`와 `chrome.exe`가 메모리에 남을 수 있습니다. 실행 전 아래 명령어로 정리하십시오.
```powershell
taskkill /F /IM node.exe /T; taskkill /F /IM chrome.exe /T
```

### 2. 서버 포트 및 타임아웃
- 프론트엔드: `http://localhost:3001` / 백엔드: `http://localhost:8080` (API Proxy)
- **Timeout**: CI 환경을 고려하여 120s로 설정되어 있습니다. (`playwright.config.ts` 참조)

### 3. CI 설정 (`playwright.config.ts`)

| 항목 | 로컬 | CI 환경 |
|------|------|---------|
| **Retries** | 2 | 5 (플레이키 테스트 강력 안정화) |
| **Workers** | 1 (OOM 방지 및 안정성) | 2 |
| **Timeout** | 300,000ms (5분) | 300,000ms (5분) |
| **Expect Timeout** | 60,000ms | 60,000ms |

---

## 🛡️ 콘솔 무결성 및 Hydration 결함 탐지 (Console Guard Architecture)

본 프로젝트는 E2E 테스트가 모든 UI 동작을 검증하여 통과하더라도, 백그라운드나 브라우저 콘솔에서 발생하는 미세한 결함을 100% 잡아내기 위해 **Console Guard Architecture**를 핵심 안전 장치로 운영합니다.

### 1. Hydration Mismatch 전역 Fail-Fast 정책
- **배경**: Next.js의 SSR/RSC 렌더링 결과와 클라이언트 Hydration 결과가 어긋나는 경우, 브라우저가 직접 크래시(Crash)를 내지 않고 콘솔에 Warning/Error 형태의 불일치 로그를 남겨 은밀한 UI 훼손을 초래합니다.
- **감지 및 차단**: `ConsoleErrorGuard`는 콘솔 출력 스트림을 실시간 감시하며, 아래의 정밀 키워드가 검출될 시 즉시 `🌊 [HYDRATION MISMATCH]` 에러로 가공해 테스트를 즉각 실패(Fail)시킵니다:
  - `Hydration failed`
  - `Text content did not match`
  - `Prop ... did not match`
  - `Did not expect server HTML`
  - `error happened outside of a Suspense boundary`

### 2. Silent HTTP API 에러 탐지 (Network Auditor)
- **원리**: API fetch 실패(400 이상)나 리소스 로딩 오류가 발생하더라도 프론트엔드가 자체 에러 바운더리나 토스트 메시지로 우회하여 E2E 테스트 검증 요소를 통과하는 '무언의 에러(Silent API Failure)' 현상을 방지합니다.
- **동작**: `response` 리스너를 통해 모든 4xx/5xx 실패를 잡아내어 에러 풀에 적재하고, 실패 시의 HTTP Method, 요청 URL, 리소스 타입을 명시해 빠른 디버깅을 유도합니다.

### 3. 경고 및 콘솔 로그 오류 식별 정책 (Zero-Tolerance Policy)
- **개념**: 운영 프로덕션 환경의 완전한 청정 상태(Clean State)를 보장하기 위해, 개발자가 소스 코드 상에 실수로 방치해 둔 일반 `console.log` 및 `console.warn` 출력을 잠재적인 오류 결함으로 간주합니다.
- **동작**:
  - `console.warn` 감지 시 **`⚠️ [FORBIDDEN CONSOLE WARNING]`** 결함으로 식별하여 즉시 E2E 테스트를 실패 처리합니다.
  - `console.log`/`console.info` 감지 시(단, Next.js 개발 서버의 Fast Refresh 및 빌드 도구의 내부 시스템 로깅 제외), **`⚠️ [FORBIDDEN CONSOLE LOG]`** 결함으로 간주하여 빌드를 즉시 중단 및 실패 처리합니다.

### 4. 특정 테스트에서 의도된 에러 무시 방법 (Escape Hatch)
만약 특정 테스트 스펙에서 고의로 에러 콘솔 로그를 유도하거나 테스트 목적상 특정 API 오류를 넘겨야 하는 경우, E2E 스펙 파일에서 `consoleGuard` 인스턴스를 확보하여 예외 패턴을 추가할 수 있습니다:
```typescript
test('특정 에러 발생 시나리오 테스트', async ({ page, consoleGuard }) => {
  // 특정 URL이나 텍스트 패턴을 일시적으로 감지 대상에서 무시 설정
  consoleGuard.addIgnorePattern(/\/api\/v1\/temporary-error/);
  
  // 에러를 유발하는 UI 클릭 액션
  await page.click('#trigger-error-btn');
});
```

---

## 📊 계층형 테스트 구조 (Tiered Architecture)

본 프로젝트의 22-Tier E2E 테스트 아키텍처의 상세 정의(Tier 1~22 파일, 검증 범위)는 **[테스트 종합 가이드](./testing-guide.md#e2e-테스트-playwright)**를 단일 진실 원천(SSOT)으로 참조한다.

> [!TIP]
> 비동기 백그라운드 이벤트, 트랜잭션 아웃박스(Outbox), 고부하 동시성 제어, 정밀 보안 필터 권한, DB 무중단 마이그레이션 등 **E2E 블랙박스 테스트 범위를 벗어나는 영역에 대한 대체 정밀 검증 방안**은 **[E2E 범위 외 정밀 검증 가이드 (Non-E2E)](./non-e2e-verification-guide.md)**를 반드시 병행 참조하여 견고한 통합 테스트를 작성하십시오.

---

## 💻 주요 명령어

```bash
# 1. 기본 실행 (전체 22 Tier 순차 실행)
npm run test:e2e

# 2. 전체 실행 (클린업 포함: 실행 전/후 가비지 데이터 제거)
npm run test:e2e:full

# 3. 특정 계층(Tier)만 실행
npx playwright test --project=tier-1-core
npx playwright test --project=tier-5-public
npx playwright test --project=tier-20-security
npx playwright test --project=tier-22-security

# 4. 특정 파일만 실행
npx playwright test e2e/01-core-base.spec.ts

# 5. UI 모드에서 대화형 디버깅
npm run test:e2e:ui

# 6. 스텝별 디버그 모드
npm run test:e2e:debug

# 7. 수동 DB 클린업 (테스트 데이터 강제 삭제)
npm run test:cleanup
```

---

## 🛠️ 유지보수 지침
- **POM 활용**: 새로운 페이지 추가 시 `e2e/pages`에 클래스를 정의하고 `fixtures/base-test.ts`에 등록하십시오.
- **자동 클린업**: 테스트 종료 시 `globalTeardown`에 등록된 `cleanup-db.ts`가 가비지 데이터를 자동으로 정리합니다.
- **에러 감시**: `ConsoleErrorGuard`가 모든 테스트에서 자동으로 동작하며, 하이드레이션 오류나 런타임 예외 발생 시 테스트를 즉시 실패 처리합니다.

---
*Last Updated: 2026-05-18 (Updated via Antigravity — Synchronized with 22-Tier Architecture & Timeout Config)*
