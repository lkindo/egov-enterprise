# ⚖️ 프론트엔드 디자인 및 UX 헌법 (Frontend Design & UX Constitution)

## 전문 (Preamble)
본 헌법은 사용자가 안전하고 신뢰할 수 있는 방식으로 핵심 과업을 완료하도록 지원하고, 다양한 프로젝트가 일관된 품질 기준 위에서 브랜드와 업무 특성을 확장할 수 있도록 하기 위해 제정한다. 시각적 표현은 과업 성공, 정보 정확성, 접근성, 개인정보 보호, 회복 가능성, 성능보다 우선할 수 없다.

---

## 제1장 사용자 중심 디자인과 프로필 (User-Centered Design & Profiles)

### 제1조 (사용자 과업과 증거 우선)
1. 중대한 정보구조(IA), 업무 흐름, 상호작용 또는 시각 체계 변경은 대상 사용자군, 핵심 과업, 현재 기준선, 실패 비용과 검증 계획을 가져야 한다.
2. 화면 수, 파일 수, LOC, 컴포넌트 채택률, 자동 검사 수는 구현·진단 지표이며 사용자 경험 개선의 충분한 증거로 간주하지 않는다.
3. 증거가 없는 판단은 사실이 아니라 가설로 기록하고, 대규모 이식 전에 대표 파일럿에서 검증한다.

### 제2조 (브랜드 중립성과 시각 효과의 절제)
1. 재사용 core는 특정 기관, 브랜드색 또는 단일 미학을 기본 진실로 가정하지 않는다. 컴포넌트는 브랜드 중립적 시맨틱 토큰을 소비하고, 배포 시 명시적으로 선택한 프로필이 같은 상태·상호작용·접근성 계약을 구현한다.
2. 브랜드 프로필과 라이트·다크·고대비 같은 색상 모드는 독립된 축으로 관리한다. 정부 공식 식별 요소는 적용 자격과 기관 구성이 확인된 경우에만 활성화한다.
3. 글래스모피즘, 그라데이션, 그림자와 모션은 정보 이해, 계층 또는 과업 피드백에 기여하고 대비·인지 접근성·성능을 해치지 않을 때만 사용한다. 장식적 효과와 애니메이션은 의무가 아니다.
4. KRDS 정렬 또는 준수 주장은 채택 버전, 적용 범위, 항목별 매핑, 예외와 검증 증거를 명시한 경우에만 허용한다.

---

## 제2장 아키텍처 및 상태 관리 (Frontend Architecture)

### 제3조 (서버 컴포넌트 우선 원칙)
1. Next.js App Router 환경에서 모든 컴포넌트는 기본적으로 **Server Component**로 설계한다.
2. 클라이언트 경계는 상호작용·브라우저 API·클라이언트 상태가 필요한 최소 실용 단위로 제한하며, 직접 지시어 파일 LOC가 아니라 route별 전송 JavaScript, hydration 경계와 사용자 성능으로 비용을 판단한다.

### 제4조 (상태 관리의 다원화 및 URL 보안 격리)
1. **원격 상태 소유권**: 서버가 단독 소유하고 클라이언트 캐시가 필요 없는 데이터는 server-only service 또는 Server Component가 가져올 수 있다. 클라이언트 상호작용, mutation, background refresh가 필요한 원격 상태는 해당 도메인이 소유하는 typed query option/key로 관리한다.
2. **URL State (공유·검색 목적 제한)**: 페이지네이션, 정렬, 탭과 같이 공유·새로고침 복원 가치가 있는 상태는 화면별 allowlist로 관리한다. 사용자가 명시적으로 입력하는 업무 검색어는 성명·사번·계정명 등 일반 개인정보가 포함될 수 있더라도, 검색 목적이 화면에 드러나고 route·query key가 명시적으로 승인되며 unknown query 재전파를 차단하는 경우 URL에 둘 수 있다. URL 허용은 모든 검색 화면의 동기화를 의무화하지 않으며, 같은 화면의 조건 변경은 불필요한 history 누적을 피하도록 replace를 우선한다.
3. **고위험·대용량 상태**: 애플리케이션은 자격증명, 세션 비밀, 인증·복구 토큰, 주민등록번호 등 고유식별정보, 금융·건강·생체 등 고위험 개인정보, 응답 데이터와 업무 본문을 의미하는 전용 field/state를 URL 또는 JavaScript 접근 가능 영속 저장소에 두도록 설계하지 않으며, 허용된 일반 검색창에서 해당 값을 요구하거나 입력하도록 유도하지 않는다. 자유 입력의 의미를 클라이언트가 완전 판별할 수는 없으므로 사용자가 예상 밖의 고위험 값을 검색어에 직접 넣을 가능성은 잔여 위험이며 고위험 용도의 승인이 아니다. 제2항에 따라 허용한 검색어는 클라이언트 로그·분석 이벤트·오류 로그 payload에 복제하지 않고, URL·브라우저 이력·북마크·다운로드 기록과 배포 환경의 프록시 로그에 남을 수 있다는 잔여 위험을 문서화한다. 배포 프로젝트는 입력 안내·검증·보존·접근 정책에 따라 허용 범위를 더 좁히거나 비URL 검색으로 대체할 수 있다.
4. **클라이언트 UI 상태**: 컴포넌트 로컬 상태를 우선하고 여러 독립 하위 트리가 공유하는 테마·shell 상태 등에는 Context를 사용할 수 있다. 외부 전역 상태 라이브러리는 실제 복잡성과 별도 채택 결정이 있을 때만 도입한다.
5. **초기 데이터 전략**: 인증된 초기 핵심 데이터는 TTFB, 최초 데이터 표시, loading 노출 시간, 중복 요청, route JavaScript와 캐시 회복을 비교해 이익이 있을 때 서버 prefetch 및 hydration을 사용한다. 상호작용 후 필요하거나 비핵심인 데이터는 client fetch를 사용할 수 있으며, 임의의 hydration 개수 quota를 두지 않는다. Server Component에서 클라이언트 훅을 직접 호출하지 않는다.
6. **인증 세션 보안 모델 (Authentication Session Security)**: 프론트엔드가 소유하는 `accessToken`의 저장·전송·검증은 다음 규범을 준수하여 URL·클라이언트 저장소로의 자격증명 누출을 차단한다. 속성 예외는 아래 ①에 명시한 명시적 평문 local loopback 개발·검증의 `Secure` 미설정뿐이며 다른 환경으로 확대하지 않는다.
   - **① 토큰 저장소 격리**: `accessToken`은 모든 환경에서 `HttpOnly` + `SameSite=Strict`인 쿠키에만 저장한다. `Secure`는 기본값이자 운영·preview·staging·공유 개발 등 배포 환경의 필수 속성이다. `development`·`test` 실행이 서버 전용 opt-in을 명시하고 내부 URL, 원 요청 `Host`, forwarding protocol·host·접속자 주소가 모두 단일 평문 local loopback(`localhost`, `127.0.0.1`, `[::1]`)으로 일치할 때만 생략할 수 있으며, 증거가 누락·모호하면 `Secure`를 유지한다. `localStorage`·`sessionStorage` 등 JavaScript로 접근 가능한 저장소에 토큰을 보관하는 것을 엄격히 금지한다(XSS를 통한 토큰 탈취 차단).
   - **② Same-Origin 프록시 경유**: 브라우저에서 백엔드로의 모든 API 호출은 동일 출처(same-origin) 프록시(클라이언트 `baseURL='/api/v1'` + `next.config.ts`의 `rewrites`)를 경유하며, 토큰은 미들웨어(`frontend/src/proxy.ts`)가 `Authorization: Bearer` 헤더로 주입한다. 브라우저 코드가 토큰 문자열을 직접 읽어 헤더에 싣지 않는다.
   - **③ 미들웨어 서명 검증(심층 방어)**: 페이지 접근 게이트인 미들웨어(`frontend/src/proxy.ts`)는 `accessToken` JWT의 HMAC 서명과 만료(`exp`)를 Web Crypto(`crypto.subtle.verify`)로 실제 검증하되, `alg`는 화이트리스트(`HS256`/`HS384`/`HS512`)로만 매핑하여 `alg=none` 및 대칭·비대칭 혼동(confusion) 공격을 차단한다. 미들웨어 검증은 위조 토큰의 관리자 UI 셸 열람을 막는 심층 방어 계층이며, 토큰의 authoritative(최종 권위) 재검증은 백엔드가 수행한다.

---

## 제3장 컴포넌트 및 스타일링 (Component & Styling)

### 제5조 (Tailwind CSS 및 반응형 설계)
1. 모든 스타일링은 **Tailwind CSS**의 유틸리티 클래스를 기반으로 한다.
2. Mobile-First를 기본으로 하되 특정 breakpoint 이름을 품질의 대리 지표로 삼지 않는다. 지원 폭, 방향, 확대, 입력 방식과 긴 콘텐츠에서 정보·기능·핵심 액션이 보존되고 예상하지 않은 양방향 스크롤이 없어야 한다.

### 제6조 (디자인 토큰 준수)
1. 반복되는 색상·간격·타이포그래피·모션·상태 결정은 시맨틱 디자인 토큰으로 표현하고, 모든 지원 프로필과 모드에서 같은 의미와 접근성 하한을 유지한다. 토큰 구조와 구현 경로는 `docs/03-guides/design-tokens.md`가 소유한다.
2. 정적 token 검사는 누락과 명백한 오류를 사전 차단하는 수단이며, 실제 합성 배경·상태·폰트·투명도를 포함한 렌더 결과 검증을 대체하지 않는다.
3. 스크롤 하이재킹을 금지하고, 사용자가 모션 감소를 요청하면 비필수 이동·반복 모션을 제거하거나 즉시 전환한다. 상태 변화의 의미와 피드백 자체를 함께 없애서는 안 된다.

### 제7조 (폼 및 데이터 입력)
1. 저장·전송되는 데이터 입력 폼은 label, instruction, 유효성 검사, 오류 연결·발화, 제출 중복 방지, 입력 보존과 서버 계약 호환성을 갖춰야 한다. 프로젝트 표준 form hook/schema는 해당 조건에 맞는 mutation·복합 검증 폼에 사용하며 단순 검색·필터까지 기계적으로 강제하지 않는다.
2. 오류는 문제가 있는 필드와 프로그램적으로 연결하고, 무엇이 잘못됐는지와 사용자가 할 수 있는 다음 행동을 명확히 제공한다. 서버 실패나 재인증 때문에 사용자의 유효한 입력을 소실해서는 안 된다.

---

## 제4장 웹 성능 및 접근성 (Performance & Accessibility)

### 제8조 (웹 성능 및 로딩 UX)
1. 성능 결정은 route별 전송 JavaScript, 실제 LCP resource, CLS, 상호작용 지연, cold/warm cache와 사용자 과업 결과를 측정해 내린다. 특정 파일 수나 직접 client LOC를 체감 성능과 등치하지 않는다.
2. 이미지 preload, lazy loading, server/client rendering은 현재 framework API와 실제 측정에 따라 선택한다. 고중량이라는 이유만으로 접근 가능한 서버 대체 표현 없이 `ssr: false`를 강제하지 않는다.
3. loading UI는 진행 상태를 이해할 수 있게 하고 layout shift와 중복 action을 방지하며 기존 stale data가 유효하면 불필요하게 지우지 않는다. Skeleton, Suspense, progress, inline pending 중 맥락에 맞는 표현을 사용하고 reduced-motion을 존중한다.
4. 변경 범위에 비례한 build artifact와 사용자 성능 budget을 검증한다. 실행하지 않은 분석을 완료 증거로 기록하지 않는다.

### 제9조 (웹 접근성 및 시맨틱 HTML)
1. 공통 UI의 접근성 목표는 **WCAG 2.2 A 및 AA** 성공기준이다. 공공서비스 프로필은 **KWCAG 2.2**와 채택한 KRDS 버전의 적용 항목을 추가로 충족한다.
2. 자동 검사는 필요조건일 뿐 준수 판정의 충분조건이 아니다. 주요 완결 과업, 상태, 역할, 반응형 변형에 대해 키보드, 화면낭독기, 확대/reflow, 고대비·forced colors, reduced motion과 다양한 입력 방식의 수동 평가를 포함한다.
3. native semantic HTML을 우선하고 ARIA는 필요한 이름·상태·관계를 보완하는 데 사용한다. 키보드 조작, 논리적·가시적·가려지지 않는 focus, overlay 진입·trap·해제·복귀, drag의 대체 수단을 보장한다.
4. 접근성 준수 주장은 평가 날짜, 표준 버전, 대상 URI·완결 과업·role/state/viewport, 제외·예외와 증거를 명시한 경우에만 허용한다. 그 전에는 목표 또는 정렬로 표현한다.

### 제10조 (보안 헤더 및 외부 리소스)
1. 외부 리소스(폰트·이미지·스크립트 출처 등)를 추가·변경할 때는 `src/proxy.ts`의 CSP(및 `next.config.ts`의 정적 보안 헤더)와 충돌 여부를 상시 확인한다. CSP가 차단하는 리소스는 오류 없이 조용히 fallback될 수 있으므로 "적용된 것처럼 보임"을 증거로 삼지 않는다.
2. **[최소 보안 헤더 베이스라인]** 보안 헤더는 두 소스로 나뉘며, 이 베이스라인의 약화(헤더 삭제·완화)는 헌법 위반으로 간주한다. **CSP는 `src/proxy.ts`(미들웨어)가 단일 소스**다 — nonce는 요청마다 달라야 하므로 정적 `headers()`로는 만들 수 없고, `next.config.ts`에 CSP가 재유입되면 이중 소스가 된다(`csp-policy` 계약이 차단). 요청 무관 정적 헤더만 `next.config.ts`의 `headers()`가 전역 경로(`/:path*`)에 부여한다.
   - **Content-Security-Policy** (proxy.ts): prod `script-src`는 `'self' 'nonce-…'`뿐이다 — `'unsafe-inline'`·`'unsafe-eval'` 없음. `script-src-attr 'none'`으로 inline 이벤트 핸들러를 차단하고, `connect-src`는 `'self'`로 한정한다. prod/dev 공통으로 `object-src 'none'`·`base-uri 'self'`·`frame-ancestors 'none'`·`form-action 'self'`를 선언하며, 위반은 `report-uri /api/security/csp`(+ `Reporting-Endpoints`)로 수집한다. (dev는 HMR을 위해 `'unsafe-eval'`·`ws:`/`wss:`를 한시 허용한다. 정적 문서 `public/governance_harness_atlas.html` 1건만 nonce를 심을 수 없어 Phase 2 정책 예외이며, 예외 확산은 `csp-policy` 계약이 차단한다.)
   - **Strict-Transport-Security**: `max-age=63072000; includeSubDomains; preload`.
   - **X-Frame-Options**: `DENY` · **X-Content-Type-Options**: `nosniff` · **Referrer-Policy**: `strict-origin-when-cross-origin` · **X-XSS-Protection**: `0`(deprecated·XS-Leaks 벡터라 비활성 — 방어는 CSP로 대체).
3. **[nonce CSP의 전제와 한계의 정직한 기록]** `script-src`의 `'unsafe-inline'`은 2026-08-20 요청별 nonce로 제거됐다(PPR 포기 제품 결정). 이 승격은 두 가지 실측 제약 위에 서 있으며, 본 조는 이를 은폐하지 않고 기록·추적할 것을 의무화한다.
   - **전 페이지 동적 렌더가 전제다**: 정적 프리렌더 HTML의 inline script에는 요청 nonce가 없어 통째로 차단된다(2026-08-20 CI e2e 실측). `cacheComponents`(PPR) 비활성과 루트 layout의 `force-dynamic`을 `csp-policy` 계약이 고정하며, 되돌리려면 nonce CSP 철회가 선행돼야 한다.
   - **`'strict-dynamic'`은 채택하지 않는다**: Next.js가 스트리밍 중 삽입하는 lazy chunk `<script src>`에 nonce가 없어 host 허용(`'self'`)이 꺼지면 앱이 전면 파손된다(2026-08-20 CI 실측). 방어는 `'self'`+nonce 조합으로 달성한다.
   - **잔여 위험**: `style-src`의 `'unsafe-inline'`은 React style prop·라이브러리 런타임 `<style>` 주입 검증(Phase 3)이 끝날 때까지 잔존하며 별도 추적한다.

---

## 제5장 하이브리드 아키텍처 및 렌더링 세이프티 (Hybrid Rendering Safety)

### 제11조 (하이드레이션 안전 및 리프 컴포넌트 격리 정책)
1. 상태나 훅을 사용하는 상호작용 요소는 책임과 재사용성을 해치지 않는 가장 작은 실용적 클라이언트 경계로 격리하며, server-safe heading·layout·static content를 불필요하게 client graph에 포함하지 않는다.
2. 서버와 클라이언트의 최초 출력은 결정적이어야 한다. 브라우저 단독 데이터가 필요하면 hydration 이후 보정, client-only leaf, 서버가 제공한 안정 초기값 등 상황에 맞는 방법을 선택하고, loading·focus·SEO·layout shift 영향까지 검증한다.

---

## 제6장 회복탄력성 및 연쇄 동기화 (Resilience & Cross-Validation)

### 제12조 (도메인 단위 Error Boundary 통합 및 거시적 복원력)
1. 클라이언트 컴포넌트 렌더링 오류나 API 통신 장애 시, 전체 화면 백화현상(White Screen of Death)을 방어하기 위해 Error Boundary를 설치하되 위젯 단위의 과도한 파편화(에러 스파게티 UI)는 전면 금지한다.
2. 경계는 route 수나 파일 수가 아니라 독립 복구 단위, query reset 범위, 인증·권한 경계와 사용자 과업의 연속성에 맞춘다. 동일한 복구 의미의 페이지별 복제를 금지한다.
3. 재시도는 영향을 받은 query 또는 작업만 대상으로 하며, 완료된 mutation의 중복 실행이나 무관한 데이터의 전역 재요청을 일으켜서는 안 된다. 새 경계는 주입된 throw, reset, retry와 focus 복귀의 실행 테스트를 동반한다.
4. initial empty, filtered-zero, 권한 없음, offline, 부분 실패, 서버 오류, unavailable 상태를 서로 구분한다. 실패를 데이터 없음으로 위장하거나 기존 유효 데이터와 작성 중 입력을 불필요하게 지우지 않는다.

### 제13조 (낙관적 UI 및 Validation 거울 동기화)
1. 낙관적 UI는 작업이 가역적이고 충돌·실패를 사용자가 이해할 수 있으며 안전하게 롤백할 수 있을 때만 사용한다. 권한·보안 설정, 파괴적·비가역 작업, 중복 실행 위험이 큰 작업은 명시적 근거가 없는 한 서버 확인 후 반영한다.
2. 클라이언트 검증은 백엔드 DTO 계약과 호환되어야 하며 DB 물리 스키마의 상한을 초과할 수 없다. 생성 계약의 결정적 재생성과 drift 차단은 required gate로 유지하고, 화면별 논리 검증은 서버·물리 한계를 약화하지 않는 범위에서 확장한다. 현재 생성 파일·명령·lint 경로는 testing guide와 gate registry가 소유한다.

---

## 제7장 품질 (Quality)

### 제14조 (검증 기반 개발)
1. 핵심 컴포넌트는 상태·시맨틱·키보드 계약을 가장 가까운 실행 테스트로 검증하고, 주요 완결 과업은 실제 사용자 UI를 통과하는 E2E와 필요한 수동 평가로 검증한다.
2. hard gate는 exact 대상 모집단, 실행 경로, required CI 소비자, 소유자, 산출 증거, 빈 모집단 방지, 재현 가능한 판정 red와 실행 binding red, 예외와 만료 정책을 가져야 한다.
3. local hook은 빠른 피드백이고 병합 권위는 required CI다. 자동 검사 수, snapshot, LOC와 같은 proxy 지표를 사용자 품질이나 표준 준수로 과장하지 않는다.
4. 컴포넌트 카탈로그를 도입할 경우 public variant·상태를 실제로 렌더하고 CI에서 검증해야 하며, 실행되지 않는 문서를 품질 증거로 간주하지 않는다. Storybook 제거의 역사적 근거는 `docs/04-operations/dependabot-alert-census.md`에서 보존한다.

---

## 제8장 시각 대비, 콘텐츠 및 레이아웃 회복력 (Visual, Content & Layout Resilience)

### 제15조 (지원 프로필과 색상 모드의 대비 무결성)
1. 모든 지원 프로필·색상 모드·상호작용 상태는 WCAG 2.2의 적용 성공기준에 따라 정상 텍스트, 큰 텍스트, 비텍스트 UI, focus indicator의 각 대비 하한을 충족해야 한다. 모든 요소에 동일한 4.5:1 수치를 기계적으로 적용하거나 로고·비활성 요소 등의 적용 조건을 무시하지 않는다.
2. 테마 전환 시 색상 묻힘(Color Bleeding)을 예방하기 위해, 모든 색상 표현은 하드코딩된 단색 값을 지양하고 시맨틱 컬러 토큰(Semantic Color Tokens)을 사용해야 한다. 다만 토큰화가 오히려 시각을 파손하는 특정 패턴 — `bg-clip-text` 텍스트 그라디언트, 의도적 다크 서피스(`surface-inverse`) 위에 중첩되는 다크 패널, 항상-흰 pill/mark 위 고정 다크 텍스트 등 — 은 `docs/03-guides/design-tokens.md`에 미치환 근거를 기록하는 것을 조건으로 예외적 잔존을 허용한다.
3. 다크모드, 반투명·이미지 배경, hover/focus/selected/disabled, forced colors에서 실제 합성 결과를 평가한다. 시맨틱 토큰 사용만으로 대비 준수를 선언하지 않는다.

### 제16조 (정보 밀도 제어 및 레이아웃 숨통 원칙)
1. 모든 대시보드 카드 및 데이터 컨테이너 컴포넌트는 정보를 좁은 고정 영역에 억지로 구겨 넣지 않고, 내용물의 물리적 한계 용량에 따라 레이아웃이 안전하게 적응하는 유연한 숨통(Breathing Space) 구조를 고수한다.
2. 긴 한국어·영문·URL, 확대와 좁은 폭에서도 정보와 기능을 잃지 않아야 한다. line-clamp는 생략이 허용되는 보조 정보에만 사용하고, 생략된 필수 정보를 hover-only tooltip에만 두지 않는다.
3. 점진적 상세와 tooltip은 hover, focus, keyboard, touch와 보조기술에서 동등하게 접근 가능해야 하며 accessible name/description으로 관계를 전달한다.
4. 사용자 가시 문구는 승인된 한국어 우선 결정과 쉬운 언어 원칙을 따르고, 내부 구현 용어, 출처 없는 수치, 비동작 action을 실제 기능처럼 노출하지 않는다.

---

## 제9장 부칙 (Supplementary Provisions)

### 제17조 (시행일)
본 헌법은 공포된 즉시 효력을 발생하며, 모든 프론트엔드 개발 및 UI 개선 작업의 최상위 지침으로 적용된다. 2026-08-20 개정은 사용자 명시 승인과 `ADR-0003`에 근거한다. 2026-09-05 제4조 URL-state 개정은 사용자 명시 승인과 `ADR-0009`에 근거하며, 개인정보성 검색어의 URL 허용 범위와 잔여 위험을 화면별 계약으로 제한한다. 같은 날 인증 세션 개정은 사용자가 승인한 헌법·하네스 개선 계획과 `ADR-0010`에 근거하며, `Secure` 미설정을 명시적으로 opt-in한 평문 local loopback 개발·검증으로 제한한다. 구체 구현·평가 절차는 해당 ADR과 연결된 architecture·testing·design-token·security 가이드가 소유한다.
