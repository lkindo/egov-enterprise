# EGOV Enterprise E2E Testing Guide (v2.0)

> **상위 원칙**: 본 문서는 [테스트 종합 가이드 (testing-guide.md)](./testing-guide.md)의 전략 및 Tier 구조를 상위 규범으로 따르는 **E2E 운영 특화 런북**입니다. 테스트 철학·등급 정의·커버리지 목표는 상위 가이드를 참조하십시오.

본 가이드는 전자정부 프레임워크 현대화 프로젝트의 E2E 테스트 안정성 확보 및 효율적인 데이터 관리를 위한 표준 운영 절차를 제공합니다.

---

## 🛡️ 테스트 작성 및 운영 원칙

### 1. 테스트 작성 전략 — 자기충족 목(self-fulfilling mock) 금지

> **[2026-08-10 전면 개정]** 종전 서술은 "`page.route` **Mocking을 기본으로** 합니다 (`e2e/user-mock.spec.ts` 참조)" 였다.
> 두 가지가 모두 사실이 아니었다. ① 그 참조 파일은 **저장소에 존재하지 않는다**(팬텀 링크).
> ② 그 지침을 따른 테스트들은 2026년 감사에서 **전량 삭제됐다** — `page.route`로 403/507/409를
> 스스로 주입한 뒤 그 응답을 그대로 단언하는 **자기충족 목**이라 앱을 전혀 검증하지 못했기 때문이다
> (06 'Simulate IP Restriction'·'Storage Full', 07 'Simulate Approval State Transition'·
> 'Simulate Organization Sync'·'Simulate Schedule Overlap Exception' — 각 스펙의 삭제 주석 참조).
> 즉 이 문서가 **삭제된 안티패턴을 권장 기본값으로 안내**하고 있었다.

- **원칙**: E2E는 실제 백엔드·DB와 통신하는 **통합 검증**을 기본으로 한다. 앱이 만들지 않은 응답을
  테스트가 주입하면, 그 테스트가 증명하는 것은 Playwright의 `route` 기능뿐이다.
- **`page.route` 를 써도 되는 경우**: 앱이 **재현할 수 없는 외부 조건**을 만들 때에 한한다.
  예) 21-advanced-resilience의 'API 500 Error Interception' — 서버를 실제로 죽일 수 없으므로 500을
  주입하되, **단언 대상은 주입한 500이 아니라 앱의 반응**(에러 토스트 렌더·UI 생존)이다.
  *주입한 값을 그대로 단언하고 있다면 그 테스트는 삭제 대상이다.*
- **검증 층위 선택**: API로 확인 가능한 계약(채번·검색·페이징·소유권)은 `request`로, 화면 배선
  (목록이 무엇을 보여주는가·어디에 착지하는가)은 UI로 확인한다. 같은 것을 두 층에서 되풀이하지 않는다.
  (24·25 스펙의 헤더 주석이 이 분업의 표준 사례다.)

### 2. 데이터 관리 및 명명 규칙 (Naming Convention)
- **Prefix**: 테스트에서 생성하는 데이터(UserId, 제목 등)는 반드시 `user_test_` 또는 `test_` 접두사를 붙여야 합니다.
- **Cleanup**: 테스트가 종료되면 가능한 한 직접 데이터를 삭제(Teardown)하거나, 아래의 클린업 명령어를 통해 가비지 데이터를 정리합니다.

### 3. 구조적 설계 (POM & Fixtures)
- **Page Object Model (POM)**: 모든 페이지 요소와 동작은 `e2e/pages` 폴더의 클래스로 캡슐화하여 유지보수성을 높입니다.
- **Fixtures**: `e2e/fixtures/base-test.ts`를 상속받아 온보딩 투어 우회 및 공통 객체 주입을 자동화합니다.

---

## 🚀 실행 환경 최적화

### 1. 좀비 프로세스 정리
윈도우 환경에서 반복 실행 시 `node.exe`와 `chrome.exe`가 메모리에 남을 수 있습니다. 실행 전 아래 명령어로 정리하십시오.
```powershell
taskkill /F /IM node.exe /T; taskkill /F /IM chrome.exe /T
```

### 2. 서버 포트 및 타임아웃
- 프론트엔드: `http://localhost:3001` / 백엔드: `http://localhost:8080` (API Proxy)

### 3. 실행 설정 (`playwright.config.ts`) — 2026-08-10 실측 현행화

> **이 표는 2026-07-28 의 예산 개정 이후 갱신되지 않아 4개 값 중 4개가 모두 틀려 있었다.**
> 문서를 근거로 인프라·설정을 단정하는 것이 이 저장소에서 반복된 사고 유형이므로(SOP §3.1-2),
> 값은 반드시 `playwright.config.ts` 원본과 대조할 것. 아래는 그 파일의 현재 값이다.

| 항목 | 로컬 | CI 환경 | 근거 |
|------|------|---------|------|
| **Retries** | 0 | **1** | 로컬 재시도는 포트 점유로 해로웠던 이력. CI는 플레이키 1건이 전체를 red로 만드는 것을 막되, 2회는 실패 비용을 3배로 키워 1회로 하향(2026-07-28) |
| **Workers** | 1 | 1 | 공유 DB 오염·OOM 방지. 병렬성은 `ci.yml`의 3-shard 매트릭스로만 확보 |
| **Timeout** | **180,000ms (3분)** | 동일 | 실측 최장 테스트 50.2s의 3.6배. 종전 300s는 CI에서 `timeout×(1+retries)`로 곱해져 잡 예산을 삼켰다 |
| **Expect Timeout** | **20,000ms** | 동일 | 요소가 **없는** 실패에서 60s를 기다려도 결과가 바뀌지 않는다 — 순수 낭비였다 |

> ⚠ 특정 화면이 구조적으로 느리다면 전역값을 되돌리지 말고 **그 단언에만** `{ timeout: N }`을 주고
> 이유를 남길 것. 전역 완화는 모든 실패를 다시 비싸게 만든다.

### 4. Playwright 프로젝트 구성 (2026-08-10 축소: 28개 → 2개)

`setup`(인증 storageState 생성) + `full-suite`(전 스펙) **2개뿐**이다.

종전에는 스펙 파일마다 `tier-N-*` 프로젝트가 하나씩 있었고(26개), `full-suite`의 `testMatch`가
`/.*\.spec\.ts/`라 **같은 스펙을 다시 전부 매칭**했다. 그래서 프로젝트를 지정하지 않고 실행하면
모든 테스트가 두 번 돌았다 — 실측 **226건(= 112 × 2 + setup 2)**. `ci.yml`이 `--project=full-suite`를
붙여 우회했으므로 **CI는 무사했지만 로컬은 계속 2배를 돌고 있었다.** 지금은 프로젝트 미지정과
`--project=full-suite`가 동일하게 **120건**이다.

특정 계층만 돌리려면 프로젝트가 아니라 **파일/제목으로 지정**한다(아래 명령어 참조).

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

본 프로젝트의 25-Tier E2E 테스트 아키텍처의 상세 정의(Tier 1~25 파일, 검증 범위)는 **[테스트 종합 가이드](./testing-guide.md#e2e-테스트-playwright)**를 단일 진실 원천(SSOT)으로 참조한다.

> **계약 소유권 (2026-08-10 정리)**: Tier 번호는 파일 이름일 뿐 소유권을 뜻하지 않는다. 같은 계약을
> 여러 Tier가 중복 검증하다 정작 인접 케이스는 비어 있는 일이 반복돼, 아래 계약은 **소유 파일을 명시**한다.
>
> | 계약 | 소유 | 비고 |
> |---|---|---|
> | `/admin` 경로 RBAC (deny-by-default·allow-list·carve-out·우회) | **23** (E4 매트릭스) | 종전 03·04·22가 각자 중복 검사했다 |
> | API 권한 (비관리자 토큰·익명) | **23** (E3) | |
> | Origin zero-trust 가드 | **23** (E5) | |
> | 부서 업무 ↔ 업무 보고 | **25** | 07·11의 중복분 삭제 |
> | 조직 ↔ 일정 | **24** | |
> | XSS 새니타이제이션 · malformed URL | **22** | |
> | 게시판 마스터 생명주기 | **03-board-master** | |
>
> 새 테스트를 붙이기 전에 **그 계약의 소유 파일이 이미 있는지** 확인할 것.

> [!TIP]
> 비동기 백그라운드 이벤트, 트랜잭션 아웃박스(Outbox), 고부하 동시성 제어, 정밀 보안 필터 권한, DB 무중단 마이그레이션 등 **E2E 블랙박스 테스트 범위를 벗어나는 영역에 대한 대체 정밀 검증 방안**은 **[E2E 범위 외 정밀 검증 가이드 (Non-E2E)](./non-e2e-verification-guide.md)**를 반드시 병행 참조하여 견고한 통합 테스트를 작성하십시오.

---

## 💻 주요 명령어

```bash
# 1. 기본 실행 (전 스펙 1회 — 2026-08-10 이전에는 여기서 2회 돌았다)
pnpm -C frontend test:e2e

# 2. 전체 실행 (클린업 포함: 실행 전/후 가비지 데이터 제거)
pnpm -C frontend test:e2e:full

# 3. 특정 계층(Tier)만 실행 — 프로젝트가 아니라 파일로 지정한다
#    (tier-N-* 프로젝트 26개는 이중 실행의 원인이라 제거됐다)
npx playwright test e2e/01-core-base.spec.ts
npx playwright test e2e/23-security-auth-supplement.spec.ts

# 4. 제목으로 필터링 (여러 파일에 걸친 관심사를 한 번에)
npx playwright test -g "Middleware"
npx playwright test -g "XSS"

# 5. 무엇이 돌지 실행 없이 확인 (서버 불필요 — 구성 사고를 즉시 잡는다)
npx playwright test --list

# 6. UI 모드에서 대화형 디버깅
pnpm -C frontend test:e2e:ui

# 7. 스텝별 디버그 모드
pnpm -C frontend test:e2e:debug

# 8. 수동 DB 클린업 (테스트 데이터 강제 삭제)
pnpm -C frontend test:cleanup

# 9. E2E 타입 검사 (서버 불필요 · pre-push 에 결속)
pnpm -C frontend type-check:e2e
```

> **`type-check:e2e` 가 왜 따로 있는가**: 루트 `frontend/tsconfig.json` 의 `exclude` 에 `"e2e"` 가
> 들어 있어, 종전 루트 타입 게이트(`npx tsc --noEmit`)가 **E2E 스펙을 한 번도 검사하지 않았다.**
> Playwright 러너도 타입을 검사하지 않고 벗겨내기만 하므로(transpile-only), E2E의 타입 오류는
> **4분짜리 CI e2e 잡이 실패해야만** 드러났다. `tsconfig.e2e.json` 이 그 공백을 메운다
> (첫 실행에서 호출부 0인 死메서드 2개와 미사용 지역변수 1건을 즉시 검출했다).

---

## 🛠️ 유지보수 지침
- **POM 활용**: 새로운 페이지 추가 시 `e2e/pages`에 클래스를 정의하고 `fixtures/base-test.ts`에 등록하십시오.
- **자동 클린업**: 테스트 종료 시 `globalTeardown`에 등록된 `cleanup-db.ts`가 가비지 데이터를 자동으로 정리합니다.
- **에러 감시**: `ConsoleErrorGuard`가 모든 테스트에서 자동으로 동작하며, 하이드레이션 오류나 런타임 예외 발생 시 테스트를 즉시 실패 처리합니다.

---
*Last Updated: 2026-08-10 (E2E 최적화 감사 — **실측 기반 전면 현행화.** ① 작성 전략 개정: "page.route Mocking 을 기본으로" 는 자기충족 목을 권장하는 서술이었고 그 지침을 따른 테스트는 전량 삭제된 상태였다(참조 파일 `user-mock.spec.ts` 도 존재하지 않는 팬텀 링크였다). ② 실행 설정 표 4개 값 전부 정정(timeout 300s→180s · expect 60s→20s · CI retries 0→1). ③ Playwright 프로젝트 28개→2개 — tier-N-* 26개가 full-suite 와 이중 매칭돼 로컬 실행이 항상 2배였다(실측 226건→120건). ④ Tier 명령을 파일/제목 지정 방식으로 교체. ⑤ 계약 소유권 표 신설. ⑥ `type-check:e2e` 신설 안내 — 루트 tsconfig 가 e2e 를 exclude 해 E2E 는 타입 검사를 받은 적이 없었다. 이전: 2026-07-23 25-Tier 동기화. 2026-05-18 23-Tier Architecture & Timeout Config)*
