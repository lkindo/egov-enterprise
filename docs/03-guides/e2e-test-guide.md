# EGOV Enterprise E2E 운영 런북

> **상위 원칙**: 본 문서는 [테스트 종합 가이드 (testing-guide.md)](./testing-guide.md)의 전략 및 계약 소유권 구조를 따르는 **E2E 운영 특화 런북**입니다. 테스트 철학·등급 정의·커버리지 목표는 상위 가이드를 참조하십시오.

본 가이드는 전자정부 프레임워크 현대화 프로젝트의 E2E 테스트 안정성 확보 및 효율적인 데이터 관리를 위한 표준 운영 절차를 제공합니다.

---

## 🛡️ 테스트 작성 및 운영 원칙

### 1. 테스트 작성 전략 — 자기충족 목(self-fulfilling mock) 금지

- **원칙**: E2E는 실제 백엔드·DB와 통신하는 **통합 검증**을 기본으로 한다. 앱이 만들지 않은 응답을
  테스트가 주입하면, 그 테스트가 증명하는 것은 Playwright의 `route` 기능뿐이다.
- **`page.route` 를 써도 되는 경우**: 앱이 **재현할 수 없는 외부 조건**을 만들 때에 한한다.
  예) `quality/error-recovery.spec.ts`의 API 500 오류 복구 테스트 — 서버를 실제로 죽일 수 없으므로 500을
  주입하되, **단언 대상은 주입한 500이 아니라 앱의 반응**(에러 토스트 렌더·UI 생존)이다.
  *주입한 값을 그대로 단언하고 있다면 그 테스트는 삭제 대상이다.*
- **검증 층위 선택**: API로 확인 가능한 계약(채번·검색·페이징·소유권)은 `request`로, 화면 배선
  (목록이 무엇을 보여주는가·어디에 착지하는가)은 UI로 확인한다. 같은 것을 두 층에서 되풀이하지 않는다.
  (`contracts/schedules.spec.ts`와 `journeys/schedules.spec.ts`, 업무·업무보고의 API/UI 소유 파일을 함께 확인한다.)
- **기능 동선의 연결**: 관리 버튼이나 페이지 제목만 확인하면 관리창 내부의 추가 조회는 실행되지 않는다.
  관리창 열기 → 실제 선택지 응답·표시 → 선택·저장 → 재조회까지 해당 기능의 UI 동선으로 확인한다.
  `request`로 준비하거나 수정한 데이터는 화면의 입력·저장 배선 증거와 구분한다. 완료 판정과 mock의
  검증 경계는 [기능 완료 체크리스트](./testing-guide.md#기능-완료를-판정하는-검증-범위)를 따른다.

### 2. 데이터 관리 및 명명 규칙 (Naming Convention)
- **Prefix**: 생성 데이터는 해당 spec이 소유하는 고유 접두사를 사용한다. `user_test_`·`test_` 외에도 `E2E26_`, `ROLE_E2E_` 등 자원별 계약이 있으므로 현재 spec과 `cleanup-db.ts`를 대조한다.
- **Cleanup**: 자신이 생성한 ID를 보존해 `finally`/teardown에서 삭제한다. 공용 cleanup은 명시된 접두사와 API만 처리하므로 신규 자원이 자동 정리된다고 가정하지 않고 대응 경로와 실패 검증을 함께 추가한다.

### 3. 구조적 설계 (POM & Fixtures)
- **Page Object Model (POM)**: 복수 spec이 공유하거나 복잡한 화면 의미를 재사용할 때만 `e2e/pages`에 둔다. hygiene 계약은 이미 제거한 미사용 POM·fixture의 재유입을 차단하며, 모든 POM의 소비자 수를 검사하지는 않는다.
- **Fixtures**: `e2e/fixtures/api-test.ts`는 브라우저 없이 요청 계약을 검사하고, `browser-test.ts`는 화면 객체와 ConsoleErrorGuard를 제공한다. 사용하지 않는 브라우저를 API 테스트 준비에 추가하지 않는다. provider 변경 시 소비 spec과 타입 검증을 같은 변경에 포함한다.

### 4. Locator 계약

- 제품 E2E의 성공 조건은 `getByRole`, `getByLabel`, 명시적인 stable test id처럼 사용자 의미를 고정하는 locator로 작성한다. Tailwind 클래스나 DOM 배치에 결합된 CSS/XPath selector는 우선 선택지가 아니다.
- fuzzy self-healing은 접근성 이름이나 화면 계약이 깨져도 다른 요소를 골라 false-green을 만들 수 있어 required E2E fixture에서 제거했다. 실패한 locator는 trace와 접근성 트리를 근거로 직접 고치고 일반 Playwright 실행으로 재검증한다.
- `frontend/src/__tests__/e2e-harness-hygiene.test.ts`가 제거된 self-healing/layout fixture와 미사용 POM의 재도입, 고정 시간 대기를 차단한다.

---

## 🚀 실행 환경 최적화

### 1. 좀비 프로세스 정리
윈도우에서 포트가 점유되어 있으면 먼저 `Get-NetTCPConnection`과 `Get-Process -Id <pid>`로 이 프로젝트가 띄운 프로세스인지 확인한 뒤 해당 PID만 종료한다. 모든 `node.exe`·`chrome.exe`를 일괄 강제 종료하면 다른 작업과 브라우저 세션을 잃을 수 있으므로 기본 절차로 사용하지 않는다.

### 2. 서버 포트 및 타임아웃
- CI는 프론트엔드 3001 / 백엔드 8080을 사용한다. 로컬 runner는 빈 loopback 임시 포트에 새 DB와 앱을 만들고 백엔드 CORS 허용 Origin도 자기 프런트엔드 주소로 고정한다. 이미 열린 개발 서버를 재사용하지 않는다.
- CI의 `--ci-compose` 경로는 해당 job이 만든 Compose DB/API의 연결과 소유권을 확인하고 Next 프로세스를 소유한다. `.env`나 외부 DB 연결을 전달하는 직접 Playwright 실행은 사용하지 않는다.

공식 로컬 실행은 `.env`가 없는 격리 worktree에서 시작한다. Docker와 Java 21 및 설치된 프런트엔드 의존성이 필요하다.

```powershell
npm run test:e2e:isolated
# 특정 책임만 확인할 때도 같은 격리 경계를 사용한다.
node scripts/run-isolated-e2e.mjs -- --project=full-suite e2e/journeys/online-polls.spec.ts
# Istanbul 계측이 필요한 별도 검증 (전체 빌드를 다시 수행한다).
pnpm -C frontend run test:e2e:coverage
```

### 3. 실행 설정 (`playwright.config.ts`)

아래 값은 이해를 위한 요약이다. 실행 전 현재 `frontend/playwright.config.ts`를 정본으로 확인한다.

| 항목 | 로컬 | CI 환경 | 근거 |
|------|------|---------|------|
| **Retries** | 0 | **1** | 재시도는 진단용이며 결과 계약은 flaky=0을 요구 |
| **Workers** | 1 | 2 | 로컬은 격리 스택의 자원 사용을 제한하기 위해 1 유지. CI는 2026-09-01 실측으로 2 workers를 채택했고 추가 병렬성은 실행시간 기반 2-shard로 확보한다. 재편본도 2026-09-21 Linux run 35575211930에서 workers=2로 파일별 시간을 재측정 |
| **Timeout** | **180,000ms (3분)** | 동일 | 특정 느린 경로는 전역 완화 대신 표적 timeout 사용 |
| **Expect Timeout** | **20,000ms** | 동일 | 요소 부재 실패의 피드백 비용 제한 |

> ⚠ 특정 화면이 구조적으로 느리다면 전역값을 되돌리지 말고 **그 단언에만** `{ timeout: N }`을 주고
> 이유를 남길 것. 전역 완화는 모든 실패를 다시 비싸게 만든다.

### 4. Playwright 프로젝트 구성

[Playwright 설정](../../frontend/playwright.config.ts)은 세 프로젝트를 소유한다.

| 프로젝트 | 모집단 | fixture 책임 |
|---|---|---|
| `setup` | `*.setup.ts` | 격리 환경 검증 뒤 인증 storageState 생성 |
| `api-contract` | `contracts/**/*.spec.ts` | 실제 HTTP 인증·인가·검색·데이터 계약 |
| `full-suite` | `journeys/**/*.spec.ts`, `quality/**/*.spec.ts` | 브라우저 동선·접근성·오류 복구·시각 검증 |

두 본 테스트 프로젝트의 spec 집합은 겹치지 않으며 각각 `setup`에 의존한다. `full-suite` 이름은 기존 snapshot 소비 경로를 보존하기 위해 유지한다. 프로젝트를 더 늘리기 전에 기존 소유 계약의 인접 케이스로 추가할 수 있는지 확인한다.

CI의 `1/2`·`2/2`은 내부 실행 job label이고 브랜치 보호 required context는 `e2e-test`다. [planner](../../scripts/e2e-shard-plan.mjs)가 [duration profile](../../frontend/e2e/shard-duration-profile.json)을 사용해 전 spec을 중복 없이 배정한다. 현재 가중치는 [Linux run 35575211930](https://github.com/lkindo/egov-enterprise/actions/runs/35575211930), SHA `1ddbabd60`, workers=2에서 관측한 파일별 본 테스트 duration 합이다. 50개 파일·135개 본 테스트(API 36 + browser 99), setup 각 2개·총 4회, skip/retry/flaky/오류 0을 확인했다. setup은 파일 가중치에서 제외하고 원래 선언 수 배분 추정의 출처는 `source.previousSource`로 보존한다. Playwright wall time은 157.6/140.9초이며 단일 표본이다. 해당 초기 run은 `secret-scan`의 합성 fixture 리터럴 탐지 후 전체 실행이 취소됐으며 전체 required 성공이 아니므로 E2E 통과를 전체 CI 완료·절감으로 보고하지 않는다.

실행 전에 만든 Playwright 목록 JSON을 결과 계약에 `--inventory`로 넘겨 spec뿐 아니라 테스트 ID와 project별 실행을 대조한다. 예상 밖 skip·누락·flaky는 실패다. 영향 shadow 보고서는 후보 매핑의 진단 자료이며 실제 API·브라우저 모집단은 계속 전수 실행한다.

---

## 🛡️ 콘솔 무결성 및 Hydration 결함 탐지 (Console Guard Architecture)

E2E가 방문한 경로에서 기능 단언 외의 브라우저 오류를 놓치지 않도록 **Console Guard Architecture**를 공통 fixture로 운영합니다. 실행하지 않은 경로나 브라우저 밖의 백그라운드 작업까지 증명하지는 않습니다.

### 1. Hydration Mismatch 수집과 실패 판정
- **배경**: Next.js의 SSR/RSC 렌더링 결과와 클라이언트 Hydration 결과가 어긋나는 경우, 브라우저가 직접 크래시(Crash)를 내지 않고 콘솔에 Warning/Error 형태의 불일치 로그를 남겨 은밀한 UI 훼손을 초래합니다.
- **감지 및 차단**: `ConsoleErrorGuard`는 콘솔 출력 스트림을 감시하며 아래 키워드를 `🌊 [HYDRATION MISMATCH]` 오류로 수집한다. `browser-test.ts`의 fixture teardown에서 `verify()`를 호출해 실패시키므로 이벤트 발생 순간에 테스트나 빌드 프로세스를 중단하는 방식은 아니다:
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
    specScope: 'error-recovery.spec.ts :: API 500 복원력을 검증한다',
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

## 📊 계약 소유권과 중복 판정

번호형 Tier 목록을 계약별 경로로 재편했다. 실제 소유 파일과 검증 계층은 [테스트 종합 가이드](./testing-guide.md#계약별-소유권과-실행-계층)를 따른다. 예를 들어 API 경로 RBAC는 `contracts/authorization.spec.ts`, 실제 브라우저의 거부·리다이렉트는 `journeys/authorization.spec.ts`, 저장 XSS는 `quality/stored-xss.spec.ts`가 맡는다.

같은 페이지를 두 번 열었다는 이유만으로 테스트를 삭제하지 않는다. 역할·사전조건·행위·단언과 fixture의 오류 감시까지 같고, 남은 테스트가 같은 위반을 검출할 때만 중복으로 정리한다. 공통 로그인·데이터 생성의 반복은 준비 비용으로 분리해서 판단한다. heading-only smoke는 진입과 브라우저 오류 감시를 증명하며 도메인의 CRUD·메일 전달·알림 발행을 증명하지 않는다.

비동기 효과·동시 쓰기·서비스 인가·물리 스키마·부하는 [E2E 밖의 검증 선택 가이드](./non-e2e-verification-guide.md)에서 소유 계층을 선택한다. 작성→실행→진단→정리의 전체 순서는 [테스트 프로세스 재설계안](../02-architecture/testing-process-redesign.md)을 따른다.

---

## 💻 주요 명령어

```bash
# 전체 API·브라우저 검증: 타입 검사 후 새 격리 스택 생성
npm run verify:e2e

# 특정 소유 계약을 격리 스택에서 진단
node scripts/run-isolated-e2e.mjs -- --project=api-contract e2e/contracts/authorization.spec.ts
node scripts/run-isolated-e2e.mjs -- --project=full-suite e2e/journeys/authentication.spec.ts

# 제목으로 표적 진단
node scripts/run-isolated-e2e.mjs -- --project=full-suite -g "XSS"

# 실행 없이 목록만 확인(서버·DB 불필요)
pnpm -C frontend exec playwright test --list

# 대화형 진단도 같은 격리 runner를 경유
node scripts/run-isolated-e2e.mjs -- --project=full-suite --ui

# E2E 타입 검사(서버 불필요)
pnpm -C frontend type-check:e2e
```

> **`type-check:e2e`가 따로 있는 이유**: 루트 `frontend/tsconfig.json`은 `e2e`를 제외하고 Playwright는 실행 전에 TypeScript 의미 검사를 대신하지 않는다. E2E 코드 변경 시 `tsconfig.e2e.json` 기반 게이트를 별도로 실행한다.

---

## 🛠️ 유지보수 지침
- **POM 활용**: 복수 spec이 공유하거나 복잡한 화면 의미를 캡슐화할 때만 `e2e/pages`에 추가한다. 생성만 하고 소비하지 않는 POM/fixture는 만들지 않으며 해당 API/브라우저 fixture provider와 실제 spec 소비를 같은 변경에서 증명한다.
- **자동 클린업**: spec은 만든 ID를 표적 정리하고 `globalTeardown`은 같은 격리 실행의 테스트 자원만 다룬다. runner는 자신이 소유한 프로세스·컨테이너·DB를 회수한다. 강제 종료 후에는 실행 namespace와 실제 소유권을 확인해 남은 자원만 정리한다. 공용 DB에 수동 cleanup을 실행하지 않는다.
- **에러 감시**: `browser-test.ts`를 사용하는 테스트의 공용 page·adminPage·userPage fixture에 `ConsoleErrorGuard`가 설치된다. 별도로 만든 page/context는 자동 포함된다고 가정하지 않는다. 수집된 오류는 fixture 종료의 `verify()`가 판정한다.
- **대기 방식**: `waitForTimeout`은 금지한다. locator 상태, URL, response, localStorage 등 관찰 가능한 조건을 기다리며 zero-tolerance ratchet이 재도입을 차단한다.

---
*E2E 구조·CI 실행 경로 검토: 2026-09-21. 새 구조의 런타임·성능 검증은 별도 CI 증거가 필요하다.*

CI는 DB/API 기동 전에 `node scripts/e2e-compose-preflight.mjs`로 Compose 설정을 검증하고, 격리 runner에서 실제 컨테이너·datasource 소유권을 다시 확인한다. 환경 플래그만으로 실행을 허용하지 않는다.
