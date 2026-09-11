# EGOV Enterprise E2E 운영 런북

> **상위 원칙**: 본 문서는 [테스트 종합 가이드 (testing-guide.md)](./testing-guide.md)의 전략 및 Tier 구조를 상위 규범으로 따르는 **E2E 운영 특화 런북**입니다. 테스트 철학·등급 정의·커버리지 목표는 상위 가이드를 참조하십시오.

본 가이드는 전자정부 프레임워크 현대화 프로젝트의 E2E 테스트 안정성 확보 및 효율적인 데이터 관리를 위한 표준 운영 절차를 제공합니다.

---

## 🛡️ 테스트 작성 및 운영 원칙

### 1. 테스트 작성 전략 — 자기충족 목(self-fulfilling mock) 금지

- **원칙**: E2E는 실제 백엔드·DB와 통신하는 **통합 검증**을 기본으로 한다. 앱이 만들지 않은 응답을
  테스트가 주입하면, 그 테스트가 증명하는 것은 Playwright의 `route` 기능뿐이다.
- **`page.route` 를 써도 되는 경우**: 앱이 **재현할 수 없는 외부 조건**을 만들 때에 한한다.
  예) 21-advanced-resilience의 'API 500 Error Interception' — 서버를 실제로 죽일 수 없으므로 500을
  주입하되, **단언 대상은 주입한 500이 아니라 앱의 반응**(에러 토스트 렌더·UI 생존)이다.
  *주입한 값을 그대로 단언하고 있다면 그 테스트는 삭제 대상이다.*
- **검증 층위 선택**: API로 확인 가능한 계약(채번·검색·페이징·소유권)은 `request`로, 화면 배선
  (목록이 무엇을 보여주는가·어디에 착지하는가)은 UI로 확인한다. 같은 것을 두 층에서 되풀이하지 않는다.
  (24·25 스펙의 헤더 주석이 이 분업의 표준 사례다.)
- **기능 동선의 연결**: 관리 버튼이나 페이지 제목만 확인하면 관리창 내부의 추가 조회는 실행되지 않는다.
  관리창 열기 → 실제 선택지 응답·표시 → 선택·저장 → 재조회까지 해당 기능의 UI 동선으로 확인한다.
  `request`로 준비하거나 수정한 데이터는 화면의 입력·저장 배선 증거와 구분한다. 완료 판정과 mock의
  검증 경계는 [기능 완료 체크리스트](./testing-guide.md#기능-완료를-판정하는-검증-범위)를 따른다.

### 2. 데이터 관리 및 명명 규칙 (Naming Convention)
- **Prefix**: 생성 데이터는 해당 spec이 소유하는 고유 접두사를 사용한다. `user_test_`·`test_` 외에도 `E2E26_`, `ROLE_E2E_` 등 자원별 계약이 있으므로 현재 spec과 `cleanup-db.ts`를 대조한다.
- **Cleanup**: 자신이 생성한 ID를 보존해 `finally`/teardown에서 삭제한다. 공용 cleanup은 명시된 접두사와 API만 처리하므로 신규 자원이 자동 정리된다고 가정하지 않고 대응 경로와 실패 검증을 함께 추가한다.

### 3. 구조적 설계 (POM & Fixtures)
- **Page Object Model (POM)**: 복수 spec이 공유하거나 복잡한 화면 의미를 재사용할 때만 `e2e/pages`에 둔다. 단일 소비·미사용 POM은 유지비만 늘리므로 hygiene 계약이 차단한다.
- **Fixtures**: `e2e/fixtures/base-test.ts`는 실제 spec이 소비하는 공통 객체만 노출한다. provider를 추가할 때 소비 spec과 타입 검증을 같은 변경에 포함한다.

### 4. Locator 계약

- 제품 E2E의 성공 조건은 `getByRole`, `getByLabel`, 명시적인 stable test id처럼 사용자 의미를 고정하는 locator로 작성한다. Tailwind 클래스나 DOM 배치에 결합된 CSS/XPath selector는 우선 선택지가 아니다.
- fuzzy self-healing은 접근성 이름이나 화면 계약이 깨져도 다른 요소를 골라 false-green을 만들 수 있어 required E2E fixture에서 제거했다. 실패한 locator는 trace와 접근성 트리를 근거로 직접 고치고 일반 Playwright 실행으로 재검증한다.
- `frontend/src/__tests__/e2e-harness-hygiene.test.ts`가 제거된 self-healing/layout fixture와 미사용 POM의 재도입, 고정 시간 대기를 차단한다.

---

## 🚀 실행 환경 최적화

### 1. 좀비 프로세스 정리
윈도우에서 포트가 점유되어 있으면 먼저 `Get-NetTCPConnection`과 `Get-Process -Id <pid>`로 이 프로젝트가 띄운 프로세스인지 확인한 뒤 해당 PID만 종료한다. 모든 `node.exe`·`chrome.exe`를 일괄 강제 종료하면 다른 작업과 브라우저 세션을 잃을 수 있으므로 기본 절차로 사용하지 않는다.

### 2. 서버 포트 및 타임아웃
- 프론트엔드: `http://localhost:3001` / 백엔드: `http://localhost:8080` (API Proxy)

### 3. 실행 설정 (`playwright.config.ts`)

아래 값은 이해를 위한 요약이다. 실행 전 현재 `frontend/playwright.config.ts`를 정본으로 확인한다.

| 항목 | 로컬 | CI 환경 | 근거 |
|------|------|---------|------|
| **Retries** | 0 | **1** | 재시도 통과도 리포트에서 flaky 신호로 추적 |
| **Workers** | 1 | 2 | 로컬은 공유 DB 안정성을 위해 1 유지. CI는 2026-09-01 실측으로 2이며, 추가 병렬성은 실행시간 기반 2-shard로 확보 |
| **Timeout** | **180,000ms (3분)** | 동일 | 특정 느린 경로는 전역 완화 대신 표적 timeout 사용 |
| **Expect Timeout** | **20,000ms** | 동일 | 요소 부재 실패의 피드백 비용 제한 |

> ⚠ 특정 화면이 구조적으로 느리다면 전역값을 되돌리지 말고 **그 단언에만** `{ timeout: N }`을 주고
> 이유를 남길 것. 전역 완화는 모든 실패를 다시 비싸게 만든다.

### 4. Playwright 프로젝트 구성

`setup`(인증 storageState 생성) + `full-suite`(전 스펙) **2개뿐**이다.

특정 계층만 돌리려면 프로젝트를 추가하지 말고 **파일/제목으로 지정**한다. `full-suite` 이름은 CI와 스냅샷 파일명이 소비하므로 변경 전 소비자를 함께 확인한다.

CI의 `1/2`·`2/2`은 내부 실행 job label이고 브랜치 보호 required context는 안정 이름 `e2e-test` 하나다. `frontend/e2e/shard-duration-profile.json`과 `scripts/e2e-shard-plan.mjs`가 최근 성공 run의 spec별 시간을 사용해 명시적 spec 집합을 배정한다. spec을 추가·삭제하거나 실행 분포가 달라지면 workflow run ID·commit·수집시각·runner·worker 수와 duration을 함께 갱신하고 `npm run test:operational-contracts`로 누락·중복·편차를 확인한다.

---

## 🛡️ 콘솔 무결성 및 Hydration 결함 탐지 (Console Guard Architecture)

E2E가 방문한 경로에서 기능 단언 외의 브라우저 오류를 놓치지 않도록 **Console Guard Architecture**를 공통 fixture로 운영합니다. 실행하지 않은 경로나 브라우저 밖의 백그라운드 작업까지 증명하지는 않습니다.

### 1. Hydration Mismatch 수집과 실패 판정
- **배경**: Next.js의 SSR/RSC 렌더링 결과와 클라이언트 Hydration 결과가 어긋나는 경우, 브라우저가 직접 크래시(Crash)를 내지 않고 콘솔에 Warning/Error 형태의 불일치 로그를 남겨 은밀한 UI 훼손을 초래합니다.
- **감지 및 차단**: `ConsoleErrorGuard`는 콘솔 출력 스트림을 감시하며 아래 키워드를 `🌊 [HYDRATION MISMATCH]` 오류로 수집한다. `base-test.ts`의 fixture teardown에서 `verify()`를 호출해 실패시키므로 이벤트 발생 순간에 테스트나 빌드 프로세스를 중단하는 방식은 아니다:
  - `Hydration failed`
  - `Text content did not match`
  - `Prop ... did not match`
  - `Did not expect server HTML`
  - `error happened outside of a Suspense boundary`

### 2. Silent HTTP API 에러 탐지 (Network Auditor)
- **원리**: API fetch 실패(400 이상)나 리소스 로딩 오류가 발생하더라도 프론트엔드가 자체 에러 바운더리나 토스트 메시지로 우회하여 E2E 테스트 검증 요소를 통과하는 '무언의 에러(Silent API Failure)' 현상을 방지합니다.
- **동작**: `response` 리스너가 4xx/5xx를, `requestfailed`가 전송 실패를 수집한다. ledger에 정확히 등록한 예상 오류 외에는 fixture 종료 시 실패하며 HTTP method·URL·리소스 타입으로 진단한다. 이미지·인증 API를 전역 제외하지 않는다. 브라우저가 취소한 화면 탐색/RSC 요청 등 제한된 기본 필터는 [error-detector.ts](../../frontend/e2e/fixtures/error-detector.ts)가 정본이다.

### 3. 경고 및 콘솔 로그 오류 식별 정책 (Zero-Tolerance Policy)
- **개념**: E2E가 실제 방문한 화면의 예상하지 않은 `console.log`·`console.warn`을 결함 신호로 취급한다. 미방문 화면이나 운영 환경 전체의 무결성을 보장하지는 않는다.
- **동작**:
  - 필터나 ledger에 해당하지 않는 warning은 **`⚠️ [FORBIDDEN CONSOLE WARNING]`**, log/info는 **`⚠️ [FORBIDDEN CONSOLE LOG]`**로 수집하고 fixture 종료 시 실패시킨다.
  - Next.js 개발 도구·React DevTools·일부 전송 종료 로그 등의 기본 필터는 source에 좁은 조건으로 정의되어 있다. 문구를 넓혀 제품 오류를 숨기지 않는다.

### 4. 특정 테스트에서 의도된 오류를 등록하는 방법

광역 정규식이나 상태 코드 전체를 무시하지 않는다. 의도한 오류는 stable ID, 정확한 spec scope, channel, URL 또는 message, method/status, 최대 횟수, 사유와 만료일을 가진 ledger로 등록한다. 미발생·초과·만료·scope 불일치도 실패하므로 예외가 영구 allow-list로 변하지 않는다.

```typescript
test('API 500 복원력을 검증한다', async ({ page, consoleGuard }) => {
  consoleGuard.expectErrors([{
    id: 'E2E-RESILIENCE-USERS-500',
    specScope: '21-advanced-resilience.spec.ts :: API 500 복원력을 검증한다',
    channel: 'response',
    urlPattern: /\/api\/v1\/admin\/system\/users(?:\?|$)/,
    messagePattern: null,
    method: 'GET',
    status: 500,
    maxOccurrences: 1,
    reason: '이 테스트가 의도적으로 주입한 단일 upstream 500 응답',
    expiresAt: '2026-12-31',
  }]);

  // 500 주입과 복구 UI를 검증한다.
});
```

---

## 📊 계층형 테스트 구조 (Tiered Architecture)

본 프로젝트의 26-Tier E2E 테스트 아키텍처의 상세 정의(Tier 1~26, 별도 게시판 마스터를 포함한 27개 spec)는 **[테스트 종합 가이드](./testing-guide.md#e2e-테스트-playwright)**를 참조한다. 실행 모집단의 정본은 spec discovery와 duration profile이며 문서가 이를 대신하지 않는다.

> **계약 소유권**: Tier 번호는 파일 이름일 뿐 소유권을 뜻하지 않는다. 중복 시나리오를 늘리기 전에 아래 소유 파일의 인접 케이스로 추가한다.
>
> | 계약 | 소유 | 비고 |
> |---|---|---|
> | `/admin` 경로 RBAC (deny-by-default·allow-list·carve-out·우회) | **23** (E4 매트릭스) | 단일 소유 파일에서 인접 케이스 확장 |
> | API 권한 (비관리자 토큰·익명) | **23** (E3) | |
> | Origin zero-trust 가드 | **23** (E5) | |
> | 부서 업무 ↔ 업무 보고 | **25** | 통합 여정 소유 |
> | 조직 ↔ 일정 | **24** | |
> | XSS 새니타이제이션 · malformed URL | **22** | |
> | 게시판 마스터 생명주기 | **03-board-master** | |
> | 부서 권한 일괄 적용·로그인 정책 쓰기 | **26** | 테스트 전용 자원에만 적용 |
>
> 새 테스트를 붙이기 전에 **그 계약의 소유 파일이 이미 있는지** 확인할 것.

> [!TIP]
> 비동기 백그라운드 효과, 동시 쓰기, 서비스 인가, 물리 스키마·부하처럼 브라우저 밖의 계약은 [E2E 밖의 검증 선택 가이드](./non-e2e-verification-guide.md)에서 실제 저장소에 연결된 검증 층을 골라 함께 확인한다.

---

## 💻 주요 명령어

```bash
# 1. 기본 실행 (전 스펙)
pnpm -C frontend test:e2e

# 2. 전체 실행 (클린업 포함: 실행 전/후 가비지 데이터 제거)
pnpm -C frontend test:e2e:full

# 3. 특정 계층(Tier)만 실행 — 프로젝트가 아니라 파일로 지정한다
pnpm -C frontend exec playwright test e2e/01-core-base.spec.ts
pnpm -C frontend exec playwright test e2e/23-security-auth-supplement.spec.ts

# 4. 제목으로 필터링 (여러 파일에 걸친 관심사를 한 번에)
pnpm -C frontend exec playwright test -g "Middleware"
pnpm -C frontend exec playwright test -g "XSS"

# 5. 무엇이 돌지 실행 없이 확인 (서버 불필요 — 구성 사고를 즉시 잡는다)
pnpm -C frontend exec playwright test --list

# 6. UI 모드에서 대화형 디버깅
pnpm -C frontend test:e2e:ui

# 7. 스텝별 디버그 모드
pnpm -C frontend test:e2e:debug

# 8. 수동 클린업 (격리 환경의 명시된 테스트 접두사를 관리자 API로 정리)
pnpm -C frontend test:cleanup

# 9. E2E 타입 검사 (서버 불필요 · pre-push 에 결속)
pnpm -C frontend type-check:e2e
```

> **`type-check:e2e`가 따로 있는 이유**: 루트 `frontend/tsconfig.json`은 `e2e`를 제외하고 Playwright는 실행 전에 TypeScript 의미 검사를 대신하지 않는다. E2E 코드 변경 시 `tsconfig.e2e.json` 기반 게이트를 별도로 실행한다.

---

## 🛠️ 유지보수 지침
- **POM 활용**: 복수 spec이 공유하거나 복잡한 화면 의미를 캡슐화할 때만 `e2e/pages`에 추가한다. 생성만 하고 소비하지 않는 POM/fixture는 만들지 않으며 `base-test.ts` provider 등록과 실제 spec 소비를 같은 변경에서 증명한다.
- **자동 클린업**: 정상 종료 경로에서 `globalTeardown`의 `cleanup-db.ts`가 명시된 테스트 데이터를 정리한다. `test:e2e:full`의 명령 연결은 `cleanup && playwright test && cleanup`이므로 Playwright 실패 뒤의 마지막 shell cleanup은 실행되지 않는다. 프로세스 강제 종료 시에는 teardown도 보장되지 않으므로 남은 자원을 확인해 표적 정리한다.
- **에러 감시**: `base-test.ts`를 사용하는 테스트의 공용 page·adminPage·userPage fixture에 `ConsoleErrorGuard`가 설치된다. 별도로 만든 page/context는 자동 포함된다고 가정하지 않는다. 수집된 오류는 fixture 종료의 `verify()`가 판정한다.
- **대기 방식**: `waitForTimeout`은 금지한다. locator 상태, URL, response, localStorage 등 관찰 가능한 조건을 기다리며 zero-tolerance ratchet이 재도입을 차단한다.

---
*Last reviewed against current sources: 2026-09-10.*
