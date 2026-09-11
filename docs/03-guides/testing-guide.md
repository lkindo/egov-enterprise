# 테스트 가이드

본 프로젝트는 단위 테스트, 통합 테스트, E2E 테스트를 포함한 다양한 테스트 계층을 사용합니다.

---

## 📋 목차

1. [테스트 구조](#테스트-구조)
2. [기능 완료를 판정하는 검증 범위](#기능-완료를-판정하는-검증-범위)
3. [단위 테스트](#단위-테스트)
4. [통합 테스트](#통합-테스트)
5. [E2E 테스트](#e2e-테스트-playwright)
6. [Testcontainers](#testcontainers)
7. [JaCoCo 커버리지](#jacoco-커버리지)
8. [k6 부하 테스트](#k6-부하-테스트)
9. [고급 오류 감지 및 디버깅](#고급-오류-감지-및-디버깅)
10. [모범 사례](#모범-사례)

---

## 테스트 구조

```
business-core/
├── src/testFixtures/java/nuri/business/support/
│   └── IntegrationTest.java          # 공용 통합 테스트 애노테이션
├── src/test/java/                     # 단위·통합 테스트
└── src/test/resources/application-test.yml

business-app/
├── src/test/java/                     # business-core test fixture 소비
└── src/test/resources/application-test.yml

frontend/
├── e2e/
│   ├── *.spec.ts              # Playwright E2E 테스트
│   └── fixtures/              # 테스트 데이터
├── src/
│   └── **/*.test.tsx          # 단위 테스트
└── playwright.config.ts       # Playwright 설정
```

---

## 기능 완료를 판정하는 검증 범위

기능의 완료 근거는 사용자가 수행하는 동선과 그 동선에서 읽고 쓰는 계약을 연결한다. 페이지 제목이나 관리 버튼의 존재만 확인했다면 진입 화면만 검증한 것이다. 변경 범위에 해당하는 항목을 아래 순서로 확인하고, 실행하지 못한 항목은 결과 보고에서 구분한다.

- [ ] 권한이 있는 사용자가 실제 메뉴에서 대상 화면과 관리창·입력 화면을 연다.
- [ ] 창을 열 때 필요한 목록·선택지 API가 성공하고, 준비한 데이터가 화면에 표시된다. 로딩 중 상태나 빈 목록을 조회 성공으로 세지 않는다.
- [ ] 실제 입력·선택·저장을 수행하고, 응답과 재조회 결과에서 값이 유지되는지 확인한다. API로 직접 저장한 결과만으로 화면의 저장 버튼 연결을 검증했다고 하지 않는다.
- [ ] 변경한 실패 경계에서 사용자가 원인을 알 수 있고 재시도·취소할 수 있는지 확인한다. 조회 실패를 빈 선택지로 처리하거나 기존 값을 지우지 않는지도 본다.
- [ ] 테스트가 만든 자원만 정리하고, 대상 커밋·실행 명령·결과·미검증 범위를 PR에 남긴다.

각 검증 계층은 서로 다른 경계를 소유한다. 같은 응답을 여러 번 단언하기보다 아래 경계가 연결되는지 확인한다.

| 계층 | 직접 실행해 확인할 계약 | 그 결과만으로 확인할 수 없는 것 |
|---|---|---|
| Repository 통합 테스트 | 실제 QueryDSL/JPA 쿼리에 전체 조회·페이징·검색·빈 결과 등 서로 다른 입력을 전달하고 정렬·행 수·전체 건수를 확인 | HTTP 매핑, production 인가, 브라우저 동선, H2와 운영 DB의 물리 정합 |
| Controller 테스트에서 service mock 사용 | 요청 바인딩, service에 넘긴 인자, 응답 envelope | 실제 service·repository 실행과 DB 조회 성공 |
| 실제 API 통합/E2E request | 인증된 요청이 controller → service → repository → 격리 DB를 통과하고 기대 응답을 반환 | 관리창을 여는 동작, 선택지 표시, 화면 입력·저장 배선 |
| UI E2E | 실제 화면에서 관리창 열기 → 선택지 로드 → 입력·저장 → 재조회 동선 | 방문하지 않은 화면과 입력 조합, 운영 환경 전체 |

프론트 단위 테스트에서 API service를 mock하면 UI의 로딩·실패·재시도 반응을 검증할 수 있다. `useQuery` 자체를 mock해 `queryFn`을 실행하지 않거나 부모 화면에서 관리창을 mock했다면 그 아래 실제 요청과 관리창 동작은 검증 범위 밖이다. 필요한 연결은 실제 API를 사용하는 기존 도메인 E2E에 둔다.

업무함의 예는 [부서 Repository 입력 테스트](../../business-core/src/test/java/nuri/business/domain/user/repository/DeptManageRepositoryPagingTest.java), [service mock을 쓰는 Controller 테스트](../../api-server/src/test/java/nuri/api/controller/system/DeptApiControllerTest.java), [업무·업무보고 E2E](../../frontend/e2e/25-deptjob-workreport-journey.spec.ts)를 함께 본다. [전체 조회 누락 사례와 red/green 판정](../04-operations/verification-blindspots.md#커버리지-100와-전체-조회-입력의-누락)은 커버리지 수치를 사용자 동선의 완전성으로 해석할 수 없는 이유를 설명한다.

---

## 단위 테스트

### 백엔드 (JUnit 5 + Mockito)

Mockito 단위 테스트는 외부 의존성을 모두 mock하고 상태뿐 아니라 중요한 협력 호출도 검증한다. 현재 생성자 의존성과 메서드 계약을 반영한 예는 [UserServiceTest.java](../../business-core/src/test/java/nuri/business/service/user/UserServiceTest.java)를 따른다. 문서의 축약 예제를 복사해 현재 서비스 API를 추정하지 않는다.

### 프론트엔드 (Vitest + React Testing Library)

```tsx
import { render, screen } from '@testing-library/react';
import { Button } from './button';

test('renders button with text', () => {
  render(<Button>Click me</Button>);
  expect(screen.getByText('Click me')).toBeInTheDocument();
});
```

API service 테스트는 [api-client-test-double.ts](../../frontend/src/test-utils/api-client-test-double.ts)의 5-method client 형태와 reset 계약을 재사용한다. 각 테스트 파일의 `vi.mock` 격리는 유지하고, 호출 이력뿐 아니라 일회성 resolve/reject 구현까지 `resetApiClientTestDouble`로 초기화해 이전 테스트의 실패 설정이 다음 테스트에 새지 않게 한다. helper는 Axios envelope가 아니라 공통 client가 이미 unwrap한 `ApiResponse.data` 값을 반환한다는 경계를 따른다. 특수 interceptor나 config 동작을 검사하는 파일은 억지로 공통화하지 않는다.

---

## 통합 테스트

### @IntegrationTest 애노테이션

> 실제 정의: [`business-core/src/testFixtures/java/nuri/business/support/IntegrationTest.java`](../../business-core/src/testFixtures/java/nuri/business/support/IntegrationTest.java)

```java
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@WebAppConfiguration("")
@SpringBootTest(
    classes = TestApplication.class,
    webEnvironment = SpringBootTest.WebEnvironment.MOCK,
    properties = {
        "spring.web.resources.static-locations=classpath:/static/",
        "spring.main.allow-bean-definition-overriding=true"
    })
@AutoConfigureMockMvc
@Import({ TestSecurityConfig.class, TestMessagingConfig.class, QuerydslConfig.class, TestCacheConfig.class })
@ActiveProfiles({ "test", "mock-security" })
@Transactional
public @interface IntegrationTest {
}
```

> `webEnvironment = MOCK` + `@AutoConfigureMockMvc` 조합으로 실제 서블릿 포트를 열지 않고 `MockMvc`로 검증하며, `@Transactional`로 각 테스트가 자동 롤백됩니다. `mock-security` 프로필과 `TestSecurityConfig`로 인증 컨텍스트를 주입합니다.

> **보안 검증 경계:** `TestSecurityConfig`는 `anyRequest().permitAll()`을 사용하므로 이 stereotype의
> MockMvc 성공은 production 인증·인가 체인의 증거가 아닙니다. 서비스·HTTP 계약 검증에만 사용하고,
> 401/403·역할·소유권을 단언하는 테스트는 production `ApiSecurityConfig`를 로드하는 보안 테스트 기반을
> 사용합니다. 남은 stereotype 분리 과제는
> [GAP-TEST-001](../../.agent/memory/known-gaps.md)에서 관리합니다.

### 사용 예시

[MenuServiceIntegrationTest.java](../../business-core/src/test/java/nuri/business/service/menu/MenuServiceIntegrationTest.java)처럼 `@IntegrationTest`를 붙이고, 테스트가 소유한 데이터를 `@BeforeEach`에서 명시적으로 준비한다. 쿼리 수·캐시·권한 같은 비기능 계약을 주장하려면 그 계약을 실제로 관측하는 단언을 포함한다.

---

## E2E 테스트 (Playwright)

### 계층형 아키텍처 (26-Tier Architecture)

본 프로젝트는 테스트의 중복을 제거하고 비즈니스 도메인별 체계적 검증을 위해 총 **26개 계층(Tier)** / 27개 스펙 파일(별도 `03-board-master-management` 포함)로 테스트를 관리합니다. 현재 파일 모집단은 `frontend/e2e`와 [실행시간 profile](../../frontend/e2e/shard-duration-profile.json)의 exact census가 정본입니다.

> Playwright project는 `setup`과 `full-suite` 두 개다. 아래 Tier는 파일 식별자이며 project가 아니다. 계층별 실행은 파일 또는 제목으로 지정하고, 현재 구성은 `frontend/playwright.config.ts`를 확인한다.

| 그룹 | Tier | 파일 | 검증 범위 |
|------|------|------|-----------|
| **Core** | 1 | `01-core-base.spec.ts` | 인증, 대시보드, 전역 레이아웃 |
| | 2 | `02-admin-system.spec.ts` | 사용자 CRUD, 메뉴, 공통코드 |
| **Business** | 3 | `03-board-community.spec.ts` | 게시판 생명주기 |
| | 3 (별도) | `03-board-master-management.spec.ts` | 게시판 마스터 생성·수정·삭제 |
| | 4 | `04-quality-resilience.spec.ts` | RBAC/CSRF, A11y, 시각적 회귀 |
| | 5 | `05-public-experience.spec.ts` | 대국민 포털 연동 |
| **Ops** | 6 | `06-ops-governance.spec.ts` | 감사 로그, 모니터링 |
| | 7 | `07-productivity-suite.spec.ts` | 개인 일정, 스크랩 |
| | 8 | `08-advanced-collaboration.spec.ts` | 협업 고도화 |
| | 9 | `09-admin-observability-workspace.spec.ts` | 관리자 관측성 |
| | 10 | `10-operational-extension.spec.ts` | 운영 확장 |
| **Enterprise** | 11 | `11-enterprise-workflow.spec.ts` | 결재 프로세스 |
| | 12 | `12-notification.spec.ts` | 알림 센터 |
| | 13 | `13-mail.spec.ts` | 메일 연동 |
| | 14 | `14-admin-workflow.spec.ts` | 관리자 업무 자동화 |
| | 15 | `15-collaboration-extension.spec.ts` | 협업 확장 |
| | 16 | `16-system-observability.spec.ts` | 시스템 가시성 |
| | 17 | `17-support-governance.spec.ts` | 온라인 매뉴얼, FAQ 생명주기 |
| | 18 | `18-business-extension.spec.ts` | ISM(비정형결재), LSM(간부일정), HPCM |
| | 19 | `19-hierarchy-modernization.spec.ts` | 부서 및 메뉴 계층 구조 최적화 검증 |
| | 20 | `20-common-security-validation.spec.ts` | 공통 보안 취약점 및 보안 필터 검증 |
| | 21 | `21-advanced-resilience.spec.ts` | API 및 DB 장애 극복 회복탄력성 검증 |
| | 22 | `22-deep-security-guard.spec.ts` | XSS 새니타이제이션(저장·반사), malformed URL 내성 — **경로/API RBAC 은 23 소유** |
| | 23 | `23-security-auth-supplement.spec.ts` | **인증·세션·접근통제 계약의 단일 소유자** — UI 로그인(E0)·위조토큰(E1)·로그인실패(E2)·API RBAC(E3)·미들웨어 경로정책 매트릭스(E4)·Origin 가드(E5)·a11y(E11)·empty-state(E12) |
| **Integration** | 24 | `24-org-schedule-journey.spec.ts` | 조직 ↔ 일정 통합 사슬 회귀 방어 |
| | 25 | `25-deptjob-workreport-journey.spec.ts` | 부서업무 ↔ 업무보고 통합 여정 |
| **Security Admin** | 26 | `26-security-admin-coverage.spec.ts` | 전용 부서 권한 일괄 적용·로그인 정책 저장 및 재조회 |

### 실행 명령어

```bash
# 전체 E2E 실행
pnpm -C frontend test:e2e

# 클린업 포함 전체 실행 (권장)
pnpm -C frontend test:e2e:full

# 특정 Tier만 실행 — 파일로 지정한다
pnpm -C frontend exec playwright test e2e/01-core-base.spec.ts
pnpm -C frontend exec playwright test e2e/18-business-extension.spec.ts
pnpm -C frontend exec playwright test e2e/22-deep-security-guard.spec.ts

# 제목 필터 (파일을 가로지르는 관심사)
pnpm -C frontend exec playwright test -g "Middleware"

# 실행 없이 목록만 확인 (서버 불필요)
pnpm -C frontend exec playwright test --list

# E2E 타입 검사 (루트 tsc 는 e2e 를 exclude 하므로 이 게이트가 유일 관문)
pnpm -C frontend type-check:e2e

# UI 모드 (대화형 디버깅)
pnpm -C frontend test:e2e:ui

# 수동 DB 클린업
pnpm -C frontend test:cleanup
```

### UI/UX 변경 전 기준선 계약

UI/UX 현대화의 변경 전 기준선은 기존 smoke E2E의 통과 여부만으로 대체하지 않는다. 다음 자산이 측정 범위와 증거 경계를 나눈다.

| 자산 | 역할 |
|---|---|
| [UI/UX 기준선 측정 프로토콜](../04-operations/ui-ux-baseline-protocol.md) | 첫 사용 안내를 포함한 8개 대표 작업의 실행 순서, 수동 접근성 절차, 개인정보 redaction, 재검증 규칙 |
| [시나리오 manifest](../../config/ui-quality-scenarios.json) | route·role·state·theme·viewport, task/performance metric, evidence 경로의 기계 판독 가능한 입력 |
| [manifest 계약 테스트](../../scripts/ui-quality-scenarios-contract.test.mjs) | 저장소 route population, 필수 metric, deterministic axe, bounded 상태와 privacy 금지 key를 fail-closed 검증 |
| [자동 기준선 runner](../../frontend/scripts/ui-quality-baseline-runner.mjs) | exact 8 scenario × 1 brand theme × 2 color mode × 3 viewport와 선언된 모든 state를 실행한다. 일반 case는 안내 완료 상태를 주입하고 전용 first-use case만 안내 모달을 연 상태로 관측한다. |
| [runner 계약 테스트](../../scripts/ui-quality-baseline-runner-contract.test.mjs) | 48 render case·96 state case의 완전성, first-use 상태 격리, 민감정보 차단, loopback/격리 preflight, 성능 반복 계약과 package script 연결을 검증 |

```bash
# manifest/runner 계약 확인 + 임시 위반 fixture의 red 증명
node --test scripts/ui-quality-scenarios-contract.test.mjs scripts/ui-quality-baseline-runner-contract.test.mjs

# 실행 계획만 확인(서비스·자격증명 불필요, 산출물 미생성)
pnpm -C frontend run ui-quality:plan

# 프로토콜 §4.1의 격리 stack·build ID·synthetic seed·private auth preflight를 충족한 뒤 실행
pnpm -C frontend run ui-quality:baseline

# 기존 smoke/resilience source의 회귀 확인(격리 서비스 필요)
pnpm -C frontend exec playwright test e2e/01-core-base.spec.ts e2e/04-quality-resilience.spec.ts
```

manifest의 현재 baseline 상태는 `unmeasured`이며 Playwright 성능값이나 사용자 연구 결과를 뜻하지 않는다. 기본 산출물 경로는 git ignored이므로 runner 결과만으로 `measured`로 승격할 수 없고, 프로토콜의 내구성 조건을 먼저 충족해야 한다. `UI_BASELINE_DIAGNOSTIC_LIMIT`으로 만든 제한 실행은 runner 진단일 뿐 baseline 증거가 아니다. 자동 axe는 고정된 Chromium·locale·timezone에서 실행하고 `color-contrast` rule을 비활성화할 수 없다. 자동 검사는 키보드 작업 완수, NVDA 발화 의미, zoom/reflow, forced-colors, reduced-motion을 증명하지 않으므로 프로토콜의 수동 검사를 별도 artifact로 남긴다. 기존 E2E source는 기능 preflight 증거일 뿐 이 baseline의 task metric·cold/warm 성능·전체 state×render matrix를 대신하지 않는다.

---

## Testcontainers

### 두 테스트 경로의 증거 경계

| 경로 | 구성 | 증명하는 것 | 증명하지 못하는 것 |
|---|---|---|---|
| 빠른 단위·통합 테스트 | 모듈별 H2 `application-test.yml`: api-server는 `create`, business-core/business-app은 `create-drop`. api-server는 공유 in-memory DB의 컨텍스트 종료 시 drop을 막기 위해 2026-09-06 전환 | 서비스·리포지토리·웹 계약과 테스트 격리 | 운영 PostgreSQL 물리 스키마와 Flyway 정합성 |
| 스키마 검증 | `api-server/src/test/resources/application-tc.yml`, PostgreSQL 17 Testcontainers + Flyway + `ddl-auto: validate` | 빈 PostgreSQL에 현재 migration 전량 적용, Entity↔물리 스키마 정합 | 운영 데이터 내용과 실제 배포 cutover |

H2는 빠른 피드백 수단이지 물리 스키마 증거가 아니다. Entity·DDL·PK 전략 변경은 Docker가 가능한 환경에서 다음 전용 task를 실행한다.

```bash
./gradlew :api-server:schemaValidationTest
```

Docker를 사용할 수 없으면 H2 green으로 대체 완료 선언을 하지 않고 PostgreSQL 검증을 보류한 이유와 재개 조건을 보고한다.


---

## JaCoCo 커버리지

### 설정 (`build.gradle`)

루트 `jacocoRootCoverageVerification`이 집계 대상과 LINE/BRANCH 래칫을 소유한다. 현재 임계값은 `build.gradle` 원본에서 확인한다. 분모 제외나 하한 완화로 green을 만들지 않고, 소스가 늘면 영향 테스트를 함께 보강한다. 실행·결과 해석의 정본은 [커버리지 워크플로](../../.agent/workflows/coverage.md)다.

### 실행 및 확인

```bash
# 루트 프로젝트 통합 리포트
./gradlew jacocoRootReport

# 집계 임계값 검증
./gradlew jacocoRootCoverageVerification

# HTML 리포트
open build/reports/jacoco/aggregated/index.html
```

### 커버리지 제외 항목

정확한 제외 패턴은 [build.gradle](../../build.gradle)의 `jacocoAggregateExcludes`와 [gate registry](../../config/governance/gates.json)의 quality population이 함께 고정한다. Q 클래스, Request/Response/DTO, Config/Application/VO, DAO/Mapper 및 Initializer/Advice 패턴 등이 포함된다. 이 문서의 분류를 근거로 제외 범위를 추가하지 않는다.

---

## k6 부하 테스트

Windows 실행 wrapper는 100/500/1000 중 하나를 `K6_SCENARIO=users-<load>` 환경값으로 전달하고, [`load-levels.js`](../../test/load-tests/scenarios/load-levels.js)가 정확히 일치하는 시나리오 하나만 선택한다. 알 수 없는 값은 범위를 넓히지 않고 즉시 실패한다.

```powershell
powershell -ExecutionPolicy Bypass -File scripts/run-load-test.ps1 `
  -LoadLevel 100 `
  -BaseUrl http://localhost:8080
```

`k6 run --scenario ...`은 유효한 k6 CLI 계약이 아니다. [`load-test-command-contract.test.mjs`](../../scripts/load-test-command-contract.test.mjs)는 wrapper·installer·scenario source에서 이 옵션의 재도입을 막고 `K6_SCENARIO` 전달과 unknown-selection 실패를 검사한다. 이 저비용 테스트는 `npm run test:operational-contracts` catalog를 통해 pre-push와 required `secret-scan`에서 실행된다.

이 계약이 green이어도 실제 처리량·지연·오류율을 증명하지는 않는다. 실제 부하는 대상 API·격리 계정·데이터와 k6 실행 환경이 필요하며, 실행·artifact·판정 방법은 [k6 부하 테스트 운영 가이드](../04-operations/load-test-guide.md)를 따른다.

---

## 고급 오류 감지 및 디버깅

E2E fixture는 방문한 화면에서 기능 단언과 함께 브라우저 오류·네트워크 실패·시각 회귀 신호를 수집한다. 실행하지 않은 경로나 외부 시스템까지 증명하지는 않는다.

### 1. 전역 브라우저 에러 감시 (Zero-Tolerance Console Guard)
E2E 테스트 실행 중 브라우저 콘솔에 에러가 발생하거나 런타임 예외가 던져지면 테스트 코드가 'Pass' 하더라도 강제로 실패 처리합니다.
- **설정**: `e2e/fixtures/error-detector.ts` 및 `base-test.ts`
- **감지 항목**:
    - `console.error()`: 스크립트 실행 중 발생하는 비치명적 오류
    - `pageerror`: 런타임 예외 및 Uncaught Error
    - **Hydration Mismatch**: React/Next.js 하이드레이션 불일치 로그를 `🌊 [HYDRATION MISMATCH]` 오류로 수집한다.

가드는 이벤트를 수집하고 `base-test.ts`의 fixture teardown에서 `verify()`로 테스트를 실패시킨다. 별도 `unhandledrejection` 리스너는 없으며 Playwright의 `pageerror`로 전달된 미처리 오류가 관측 대상이다.

### 2. 네트워크 리소스 무결성 검사 (Network Auditor & Silent API 가드)
이미지 404, 깨진 폰트, CSS 로딩 실패 및 백그라운드 API 호출 오류(Silent API Failure)를 자동으로 감지합니다.
- **동작**: `response` 리스너가 리소스와 API의 400 이상 응답을 수집하고, `requestfailed`가 전송 실패를 수집하여 fixture teardown에서 판정합니다.
- **세부 진단 정보**: 오류 발생 시 HTTP Method(`GET`, `POST` 등), 요청 URL, 상태 코드, 리소스 타입을 상세 로그로 출력하여 원인 파악을 극대화합니다.
- **의도한 오류**: 이미지·인증 API를 일괄 제외하지 않습니다. 개별 테스트의 오류는 scope·URL·method·status·발생 횟수·만료일을 가진 expected-error ledger로 등록합니다. 브라우저 탐색 취소·프레임워크 중복 로그 등 기본 필터의 정확한 조건은 [error-detector.ts](../../frontend/e2e/fixtures/error-detector.ts), 사용법은 [E2E 런북](e2e-test-guide.md#4-특정-테스트에서-의도된-오류를-등록하는-방법)을 따릅니다.

### 3. 정밀 시각 회귀 테스트 (VRT)
UI 프레임워크나 테마 변경 시 발생하는 미세한 레이아웃 시프트를 감지합니다.
- **임계값**: 전역 기본값은 `playwright.config.ts`, 화면별 허용치는 해당 `toHaveScreenshot` 호출이 정본이다. 기준선을 재생성해 차이를 숨기지 않는다.
- **실행**: `pnpm -C frontend exec playwright test e2e/04-quality-resilience.spec.ts`

### 4. 하이드레이션 오류 조기 경보 및 E2E 연동
Next.js의 서버/클라이언트 불일치 문제를 신속히 잡기 위해, 클라이언트 컴포넌트의 `StandardErrorBoundary`가 수집한 불일치 정보를 콘솔에 `🌊 [HYDRATION MISMATCH DETECTED]` 플래그로 출력하며, `ConsoleErrorGuard`가 이를 수집해 해당 Playwright 테스트를 실패시킵니다. 이 가드는 실제로 방문한 경로의 브라우저 로그만 관측하므로 미실행 화면까지 증명하지 않습니다.

---

## 모범 사례

### 1. 테스트 명명

```java
// ❌ 나쁜 예
@Test
void test1() { }

// ✅ 좋은 예
@Test
@DisplayName("사용자 목록 조회 - N+1 쿼리 해결 검증")
void getUserList_NPlusOneResolved() { }
```

### 2. AAA 패턴

테스트 본문은 준비(Arrange/Given), 실행(Act/When), 결과와 협력 검증(Assert/Then)을 구분한다. 테스트 데이터는 실제 builder·factory와 현재 public API를 사용하며, 예시용 가짜 생성자나 존재하지 않는 메서드를 만들지 않는다.

### 3. 테스트 독립성

```java
// ❌ 나쁜 예: 순서 의존적
@Test void test1() { repository.save(data); }
@Test void test2() { // test1 이 실행되었다고 가정 }

// ✅ 좋은 예: 각 테스트가 독립적
@BeforeEach
void setUp() {
    repository.deleteAll();
    repository.save(testData);
}
```

### 4. Testcontainers 정리

컨테이너 생명주기는 JUnit/Testcontainers가 소유하도록 `@Testcontainers`와 `@Container`를 사용한다. 임의 Docker 프로세스·볼륨 일괄 삭제를 테스트 정리 절차에 넣지 않는다.

### 5. E2E 테스트 데이터 정리

`frontend/e2e/scripts/cleanup-db.ts`가 Playwright `globalTeardown` 및 `test:e2e:full`의 전후 단계에서 실행된다. 일반 운영 DB가 아니라 격리된 E2E 환경을 대상으로 하며, 관리자 API로 명시된 테스트 접두사의 리소스만 정리한다. 새 시나리오가 영속 데이터를 만들면 다음을 같은 변경에 포함한다.

1. 충돌하지 않는 E2E 전용 이름/ID 접두사
2. 대응 cleanup 조회·삭제 경로
3. cleanup 실패가 테스트 결과에서 보이도록 하는 검증

임의 `TRUNCATE`, 광범위 raw SQL 삭제, 운영 자격증명 사용은 E2E 정리 절차에 넣지 않는다.

---

## 문제 해결

### "Could not find docker"

**해결**: Docker Desktop 설치 및 실행

### "Executable doesn't exist" (Playwright)

**해결**:
```bash
pnpm -C frontend exec playwright install --with-deps chromium
```

### JaCoCo 리포트에 실행 데이터가 없음

[커버리지 워크플로](../../.agent/workflows/coverage.md)의 순서대로 실패 테스트, 집계 대상, 같은 실행에서 생성된 `.exec` 파일을 확인한 뒤 `./gradlew jacocoRootReport`를 다시 실행한다. 태스크 `SKIPPED`나 입력 0개 상태를 성공으로 간주하지 않고, `clean`은 입력 불일치가 확인된 경우에만 사용한다.

## 중앙 하네스 레지스트리와 실행 분리

[governance gate registry](../../config/governance/gates.json)는 논리 규칙을 한 거대 테스트로 합치는 파일이 아니라, 안정적인 rule ID와 발견 selector·실행 task·CI context·red proof를 연결하는 운영 인덱스다. 현재 registry는 governance JUnit 38개·ArchUnit 10개·schema-validation 49개, runner catalog 7개, execution profile 7개, quality population 3개와 quality ratchet 15개를 관리한다(2026-09-10 실측 — 정확한 현재 수는 이 문서가 아니라 registry 계약 실행 출력이 정본이다). [Node 계약](../../scripts/governance-gates-contract.mjs)이 실제 source census와 소비자 설정을 exact-match하고, JaCoCo·Vitest·PIT의 측정 population까지 동결하므로 registry/source 한쪽에만 있는 ghost gate나 include 축소·exclude 확대에 의한 분모 축소 통과는 실패한다.

| 계층 | 발견 계약 | 실행 경로 |
|---|---|---|
| Governance JUnit | 클래스 `@Tag("governance-harness")` | `:api-server:harnessTest` |
| Architecture | ArchUnit native `@ArchTag("architecture-gate")` | 각 모듈 기본 `test` |
| PostgreSQL schema | 클래스 `@Tag("schema-validation")` | `:api-server:schemaValidationTest` |
| Node 운영 계약·Frontend invariant·Vitest·Playwright·PIT | registry의 runner selector/catalog | package script·CI aggregate context |

새 gate는 stable ID, selector tag, 실제 task/required context, owner, 근거와 의도적 red proof를 함께 추가한다. `scripts/*.test.mjs`처럼 catalog로 소유한 저비용 운영 계약은 파일을 추가하면 별도 runner 목록 편집 없이 편입되며, k6 CLI·CI·의존성·문서 계약도 이 경로를 사용한다. 규칙 파일 수를 줄이기 위한 무관한 통합은 실패 위치와 소유권만 흐리므로 하지 않는다. 여러 Java source를 읽는 governance gate는 `HarnessSourceIndex`를 사용해 테스트 JVM당 동일 스냅샷을 공유하고 직접 `Files.walk/readString` 재도입은 계약이 차단한다.

## 스키마 정합성 전용 게이트

모듈의 일반 `application-test.yml`은 주로 H2 `create`(또는 `create-drop`)를 사용하므로 Entity 정의로 테스트 스키마를 만들며, 운영 PostgreSQL과 Flyway의 물리 정합성을 증명하지 못한다. 스키마 증거는 `api-server`의 `tc` 프로필과 `schemaValidationTest`가 소유한다.

### 1. 로컬·CI 실행

```bash
# Docker 필요: 빈 PostgreSQL 17 + Flyway 전량 적용 + Hibernate validate
./gradlew :api-server:schemaValidationTest

# 병합 전 전체 로컬 게이트에도 포함
./gradlew localGate
```

CI의 `backend-scope`는 classifier가 schema 영향으로 판정한 경우 같은 PostgreSQL 스키마 검증 task를 실행하고, 안정 required context `backend-build`가 그 결과를 집계한다. required check 상태는 현재 커밋에서 직접 확인하며, 일반 `test`나 컴파일 green을 스키마 검증 대체물로 보고하지 않는다.

45개 스키마·migration 테스트 클래스는 `SharedPostgresMigrationTestSupport`의 PostgreSQL 17 컨테이너 하나를 공유하되 테스트 클래스마다 격리 database를 생성·삭제한다(2026-09-10 source census). 공유는 startup 비용만 줄이며 DB 이름·Flyway 적용·connection lifecycle 격리 계약은 `SharedPostgresMigrationHarnessContractTest`가 보호한다. Spring `jdbc:tc` 기반 검증은 별도 컨테이너 경로이므로 `schemaValidationTest` 전체 실행에서 PostgreSQL start는 최대 2개다. 독립 `migration-tool`의 프로세스 복구 테스트처럼 다른 task가 시작한 컨테이너는 이 수에 포함하지 않는다.

### 2. 로컬 훅 경계

활성 훅은 `.githooks/pre-push`이며 클론마다 `git config core.hooksPath .githooks`로 연결한다. 훅은 빠른 범위별 피드백을 제공하지만 Docker 스키마 검증과 E2E 전체를 대신하지 않는다. 실제 포함 task와 우회 경계는 [.githooks/README.md](../../.githooks/README.md), 병합 권위는 required CI를 따른다.

### 3. H2 보조 DDL

`foundation/src/test/resources/db/migration/V1__init_test_schema.sql`과 [SchemaDumper.java](../../business-core/src/test/java/nuri/business/support/SchemaDumper.java)는 일부 H2 테스트를 위한 보조 자산이다. 자동 생성 결과를 운영 DDL이나 PostgreSQL 정본으로 승격하지 않는다. 갱신 시 diff를 검토하고 H2 테스트와 `schemaValidationTest`를 각각 실행한다.

---

- [CI/CD 파이프라인 가이드](./cicd-pipeline.md)
- [E2E 테스트 가이드 (상세)](./e2e-test-guide.md)
- [E2E 범위 외 정밀 검증 가이드 (Non-E2E)](./non-e2e-verification-guide.md)
- [성능 최적화 가이드](../04-operations/performance-optimization-guide.md)

---
*Last reviewed against current sources: 2026-09-10.*

