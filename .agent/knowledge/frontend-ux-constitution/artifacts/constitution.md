# ⚖️ 프론트엔드 디자인 및 UX 헌법 (Frontend Design & UX Constitution)

## 전문 (Preamble)
본 헌법은 `egov-enterprise` 프로젝트의 시각적 완성도를 극대화하고, 사용자에게 일관된 프리미엄 경험을 제공하기 위해 제정되었다. 모든 사용자 인터페이스(UI)와 사용자 경험(UX) 설계는 본 헌법이 정한 디자인 원칙을 준수해야 하며, 본 헌법은 기술적 성능과 시각적 예술성의 완벽한 조화를 추구한다.

---

## 제1장 디자인 철학 및 비주얼 테마 (Unified Premium)

### 제1조 (비주얼 아이덴티티: Unified Premium)
1. 본 시스템은 관리의 실용성과 시각적 우아함이 공존하는 **"Unified Premium"** 테마를 지향한다.
2. 핵심 브랜드 컬러인 **Hub Blue (#0055FF)**를 중심으로 정제된 팔레트를 사용하여 전문적인 분위기를 유지한다.
3. 'Unified Premium' 테마의 정제된 아름다움을 유지하기 위해 난잡한 원색 그라데이션과 네온 3D 효과는 철저히 금지하되, 정보의 가독성 및 레이어 깊이감을 보장하는 단색 기반의 미세한 글래스모피즘(backdrop-blur) 및 부드러운 전환 인터랙션(Micro-interactions)은 적극 권장하여 평면적 미니멀리즘과 Rich 입체 미학을 대통합한다.

### 제2조 (Rich Aesthetics 적용 원칙)
사용자에게 시각적 놀라움(WOW)을 주기 위해 다음의 요소를 적극 활용한다.
1. **Glassmorphism**: 레이어 간의 깊이감을 위해 `backdrop-blur`와 반투명 배경을 적재적소에 사용한다.
2. **Smooth Gradients**: 단색 배경보다는 미세한 선형/방사형 그라데이션을 활용하여 입체감을 부여한다.
3. **Micro-interactions**: 버튼 호버, 리스트 전환 등 인터랙션 지점에 부드러운 전환 애니메이션을 필수적으로 적용한다.

---

## 제2장 아키텍처 및 상태 관리 (Frontend Architecture)

### 제3조 (서버 컴포넌트 우선 원칙)
1. Next.js App Router 환경에서 모든 컴포넌트는 기본적으로 **Server Component**로 설계한다.
2. `'use client'` 지시어는 인터랙션이 필요한 최소 단위의 컴포넌트에만 제한적으로 사용한다.

### 제4조 (상태 관리의 다원화 및 URL 보안 격리)
1. **Server State**: 모든 서버 데이터 fetch 및 캐싱은 **TanStack Query**를 통해서만 관리한다.
2. **URL State (공유 목적 제한)**: 페이지네이션, 정렬 기준 등 타인과 공유 시 동일한 화면을 보장해야 하는 비민감성 상태에 한해서만 쿼리 스트링(`useSearchParams`)을 제한적으로 사용한다.
3. **Session/Context 격리 (보안/대용량 방어)**: HTTP 414 (URI Too Long) 에러를 유발할 수 있는 방대한 다중 배열 필터나, 개인정보 등 민감 데이터는 절대로 URL에 노출하지 않고 `Zustand`나 `SessionStorage`에 격리 보관한다. 매우 복잡한 복합 검색은 백엔드의 `POST` 기반 검색 API로 전환하는 것을 원칙으로 한다.
4. **Global UI State**: 테마, 사이드바 토글 상태 등 클라이언트 전역 UI 상태는 React Context를 사용한다.
5. **SSR 초기 데이터 하이드레이션 패턴**: Server Component에서 fetch한 초기 데이터는 `dehydrate(queryClient)` → `<HydrationBoundary>`를 통해 클라이언트의 TanStack Query 캐시로 인계하는 것을 표준 패턴으로 한다. Server Component 내에서 `useQuery` 등 클라이언트 훅을 직접 호출하는 것은 엄격히 금지한다.
6. **인증 세션 보안 모델 (Authentication Session Security)**: 인증 토큰의 저장·전송·검증은 다음 규범을 예외 없이 준수하여 URL·클라이언트 저장소로의 자격증명 누출을 차단한다.
   - **① 토큰 저장소 격리**: `accessToken`은 `HttpOnly` + `Secure` + `SameSite` 속성을 부여한 쿠키에만 저장하며, `localStorage`·`sessionStorage` 등 JavaScript로 접근 가능한 저장소에 토큰을 보관하는 것을 엄격히 금지한다(XSS를 통한 토큰 탈취 차단).
   - **② Same-Origin 프록시 경유**: 브라우저에서 백엔드로의 모든 API 호출은 동일 출처(same-origin) 프록시(클라이언트 `baseURL='/api/v1'` + `next.config.ts`의 `rewrites`)를 경유하며, 토큰은 미들웨어(`frontend/src/middleware.ts`)가 `Authorization: Bearer` 헤더로 주입한다. 브라우저 코드가 토큰 문자열을 직접 읽어 헤더에 싣지 않는다.
   - **③ 미들웨어 서명 검증(심층 방어)**: 페이지 접근 게이트인 미들웨어(`frontend/src/middleware.ts`)는 `accessToken` JWT의 HMAC 서명과 만료(`exp`)를 Web Crypto(`crypto.subtle.verify`)로 실제 검증하되, `alg`는 화이트리스트(`HS256`/`HS384`/`HS512`)로만 매핑하여 `alg=none` 및 대칭·비대칭 혼동(confusion) 공격을 차단한다. 미들웨어 검증은 위조 토큰의 관리자 UI 셸 열람을 막는 심층 방어 계층이며, 토큰의 authoritative(최종 권위) 재검증은 백엔드가 수행한다.

---

## 제3장 컴포넌트 및 스타일링 (Component & Styling)

### 제5조 (Tailwind CSS 및 반응형 설계)
1. 모든 스타일링은 **Tailwind CSS**의 유틸리티 클래스를 기반으로 한다.
2. 다양한 디바이스 환경을 지원하기 위해 **Mobile-First** 전략을 취하며, 프로젝트 표준 브레이크포인트(`sm`, `md`, `lg`, `xl`)를 엄격히 준수한다.

### 제6조 (디자인 토큰 준수)
1. 하드코딩된 수치 대신 사전에 정의된 **디자인 토큰** CSS 변수를 반드시 사용한다. 색상 토큰의 SSOT는 `frontend/src/app/globals.css`(`@theme` + `:root`/`.dark` HSL 변수)이며, 그 실무 지침·팔레트 리터럴→토큰 매핑 규약은 `docs/03-guides/design-tokens.md`를 따른다(팔레트 리터럴 `slate-500` 대신 시맨틱 토큰 `bg-muted` 등을 참조). 이 준수는 `frontend/eslint.config.mjs`의 `local-theme/enforce-design-tokens` 규칙으로 탐지되나 그 레벨은 **자문(`warn`)** 이며 CI·`pre-push` 게이트가 lint를 실행하지 않으므로 하드 차단 게이트가 아니다. 정적 검증(`tsc --noEmit`/`next build`)은 색·다크모드 시각 회귀를 잡지 못하므로, 대규모 색 변경 시에는 **라이트/다크 양 모드 육안 검증**을 병행하는 것을 의무로 한다.
2. 모든 모션 컴포넌트는 기본적으로 감쇠비가 높은 감속형 모션(Damped Motion) 프로필을 공통 상속해야 하며, 사용자의 스크롤을 저해하는 스크롤 하이재킹(Scroll Hijacking)과 같은 인위적인 시각 효과는 적용하지 않는다.
3. **[모션 접근성 존중 의무]** 사용자의 운영체제가 모션 감소를 요청한 경우(`prefers-reduced-motion: reduce`), 모든 전환 애니메이션의 duration을 0ms로 축소하거나 즉시 전환(instant transition) 처리하여 전정 장애(Vestibular Disorder) 사용자의 접근성을 보장한다. 이는 제9조(WCAG 2.1 AA)의 하위 이행 조항으로서 예외 없이 적용된다.

### 제7조 (폼 및 데이터 입력)
1. 모든 데이터 입력 폼은 `useAppForm` (react-hook-form + Zod)을 사용하여 상태를 격리하고 유효성을 검증한다.
2. 입력 오류 시 사용자에게 즉각적이고 명확한 피드백(Inline Error Message)을 제공해야 한다.

---

## 제4장 웹 성능 및 접근성 (Performance & Accessibility)

### 제8조 (웹 성능 및 로딩 UX)
1. **LCP** 최적화를 위해 핵심 이미지는 `next/image`의 `priority` 속성을 사용하며, 고중량 라이브러리는 지연 로딩한다.
2. 고중량 시각화 컴포넌트는 반드시 `next/dynamic`을 사용하여 `ssr: false` 옵션으로 Lazy Loading 한다.
3. 데이터 로딩 중에는 사용자가 대기 시간을 인지할 수 있도록 **Skeleton Screen** 또는 **Suspense**를 활용한 부드러운 전환을 제공한다.
4. 기능 추가 후 `npm run analyze`를 실행하여 특정 패키지가 번들 사이즈에 미치는 영향을 체크한다.
5. 데이터 로딩 대기 화면은 레이아웃 시프트를 막기 위해 실제 렌더링될 컴포넌트의 기하학적 형태(원형, 줄글 형태 등)와 1:1로 매칭되는 스켈레톤 스크린(Skeleton Screen)을 구성하여 부드러운 펄스(Pulse) 또는 정제된 시머(Shimmer) 모션으로 렌더링한다. 단, 버튼 내부 제출이나 인라인 상태 체크 등 스켈레톤 표현이 불가능한 국소 인터랙션 영역에 한하여 차분한 2D 플랫 스피너(Flat Spinner) 사용을 허용한다.

### 제9조 (웹 접근성 및 시맨틱 HTML)
1. 모든 UI는 시맨틱 HTML 태그를 사용하여 구조화하며, **WCAG 2.1 AA** 등급 이상의 접근성 표준을 준수한다. 이 준수는 `@axe-core/playwright` 기반 E2E 접근성 스캔(`AxeBuilder(...).analyze()` 실행 후 위반 목록을 `expect(violations).toEqual([])`로 단언, `frontend/e2e/*.spec.ts`)으로 기계 증거화하며, 제14조 Playwright 게이트 및 CI `e2e-tests`(3-shard) 실행과 연계한다. 현재 스캔은 핵심 화면 표본을 대상으로 하므로, 전수 커버리지 확대를 후속 과제로 둔다.
2. 키보드만으로 모든 기능을 조작할 수 있어야 하며, 스크린 리더 사용자를 위한 `aria-label` 등 적절한 속성을 부여한다.

### 제10조 (보안 헤더 및 외부 리소스)
1. `next.config.ts`의 CSP 설정과 외부 리소스(Google Fonts 등) 연동 시 충돌 여부를 상시 확인한다.
2. **[최소 보안 헤더 베이스라인]** `next.config.ts`의 `headers()`는 아래 하드닝 헤더를 prod/dev 분리로 전역 경로(`/:path*`)에 부여하며, 이 베이스라인의 약화(헤더 삭제·완화)는 헌법 위반으로 간주한다.
   - **Content-Security-Policy**: prod는 `script-src`에서 `'unsafe-eval'`을 제거하고 `connect-src`를 `'self'`로 한정한다. prod/dev 공통으로 `object-src 'none'`·`base-uri 'self'`·`frame-ancestors 'none'`·`form-action 'self'`를 선언하며, 위반은 `report-uri /api/security/csp`(+ `Reporting-Endpoints`)로 수집한다. (dev는 HMR을 위해 `'unsafe-eval'`·`ws:`/`wss:`를 한시 허용한다.)
   - **Strict-Transport-Security**: `max-age=63072000; includeSubDomains; preload`.
   - **X-Frame-Options**: `DENY` · **X-Content-Type-Options**: `nosniff` · **Referrer-Policy**: `strict-origin-when-cross-origin` · **X-XSS-Protection**: `0`(deprecated·XS-Leaks 벡터라 비활성 — 방어는 CSP로 대체).
3. **[unsafe-inline 잔존의 정직한 기록]** 현재 prod CSP의 `script-src`에는 Next.js RSC(React Server Components) 부트스트랩 요구로 인해 `'unsafe-inline'`이 잔존한다. 이는 알려진 잔여 위험이며, `nonce` + `strict-dynamic` 기반으로의 승격은 PPR(부분 사전 렌더링) 채택 여부와 결부된 제품 결정 과제로 남긴다. 본 조는 이 잔존 사유와 승격 경로를 은폐하지 않고 명시적으로 기록·추적할 것을 의무화한다.

---

## 제5장 하이브리드 아키텍처 및 렌더링 세이프티 (Hybrid Rendering Safety)

### 제11조 (하이드레이션 안전 및 리프 컴포넌트 격리 정책)
1. Next.js App Router 렌더링 환경에서 불필요한 번들 크기 팽창과 클라이언트 하이드레이션 병목을 차단하기 위해, 상태나 훅(Hook)을 사용하는 인터랙션 요소는 반드시 **최하단 잎(Leaf) 노드 컴포넌트로 분리 격리**하여 적용한다.
2. 브라우저 단독 데이터(Date API, localStorage 등) 사용에 따른 서버와 클라이언트 간의 하이드레이션 불일치(Hydration Mismatch) 오류를 방지하기 위해, 해당 로직은 반드시 `useEffect` 내에서 처리하거나 dynamic 임포트를 통해 `ssr: false` 처리를 의무 적용한다.

---

## 제6장 회복탄력성 및 연쇄 동기화 (Resilience & Cross-Validation)

### 제12조 (도메인 단위 Error Boundary 통합 및 거시적 복원력)
1. 클라이언트 컴포넌트 렌더링 오류나 API 통신 장애 시, 전체 화면 백화현상(White Screen of Death)을 방어하기 위해 Error Boundary를 설치하되 위젯 단위의 과도한 파편화(에러 스파게티 UI)는 전면 금지한다.
2. **도메인 바운더리 묶음 관리**: 연관된 데이터와 위젯이 모여 있는 거시적 비즈니스 구역 단위(예: 대시보드 블록, 데이터 테이블 전체)로 상위 레벨에 단일 `Error Boundary`를 씌워 장애를 응집도 있게 통제한다.
3. **원버튼 글로벌 재시도(Global Retry)**: 영역 내 에러 발생 시 산발적인 여러 개의 재시도 버튼 대신, 공통 Fallback 화면에 단일 [재시도] 버튼을 배치하고 `queryClient.refetchQueries`를 호출하여 도메인 내 망가진 API를 일괄 재요청하도록 제어권을 단순화한다.
4. **비명 지르지 않는 Empty State UI**: 원색적인 경고창으로 화면 레이아웃을 난도질하는 것을 금지하며, 기존 컴포넌트의 윤곽과 레이아웃을 유지한 차분한 무채색의 엠프티 상태(Empty State) 디자인을 Fallback UI로 표출하여 사용자 피로도를 경감시킨다.

### 제13조 (낙관적 UI 및 Validation 거울 동기화)
1. TanStack Query를 통한 데이터 변경(Mutation) 시 사용자 체감 속도 향상을 위해 **낙관적 UI(Optimistic Update)**를 구현하되, 통신 실패 시 즉각 롤백하고 서버 상태 캐시를 무효화(Query Invalidation)하는 방어 코드를 필수 작성한다.
2. Zod 스키마 및 폼 유효성 검사 규칙은 백엔드 DTO 검증 범위와 호환되어야 하며 DB 물리 스키마 상한 제약조건을 초과할 수 없다. 이 DB→DTO→Zod 단방향 거울 동기화는 `codegen:verify:zod` 게이트(`.github/workflows/ci.yml` + `.githooks/pre-push`, HARD)로 기계 강제된다 — 커밋된 백엔드 스펙(`api-docs.json`)으로부터 `generated-zod.ts`를 결정적(deterministic)으로 재생성한 뒤 `git diff --exit-code`로 드리프트 발생 시 빌드/푸시를 차단한다. 따라서 화면 검증 스키마는 인라인 `z.object(...)` 정의를 금지하고(`frontend/eslint.config.mjs`의 `no-restricted-syntax` — `error` 레벨), 백엔드 SSOT 스키마(`@/types/generated-zod`)를 `import`한 뒤 `.extend()`로만 확장한다. 물리 한계를 넘지 않는 범위 내에서는 화면 비즈니스 요건에 맞춰 독립적인 논리 검증 규칙(예: regex, refine)을 `.extend()` 위에 정의하는 자율성을 보장한다.

---

## 제7장 품질 (Quality)

### 제14조 (검증 기반 개발)
1. 모든 핵심 UI 컴포넌트는 **Storybook**을 통해 검증하며, 주요 시나리오는 **Playwright** 기반의 E2E 테스트를 통과해야 한다.

---

## 제8장 시각적 조화 및 레이아웃 숨통 (Visual Harmony & Breathing Layout)

### 제15조 (하이브리드 다크/라이트 모드 대비 무결성)
1. 모든 UI 요소(버튼, 레이블, 보더 등)는 주야 모드 전환 시 최소 대비율(WCAG 2.1 Contrast Ratio 4.5:1 이상)을 예외 없이 충족해야 한다.
2. 테마 전환 시 색상 묻힘(Color Bleeding)을 예방하기 위해, 모든 색상 표현은 하드코딩된 단색 값을 지양하고 시맨틱 컬러 토큰(Semantic Color Tokens)을 사용해야 한다. 다만 토큰화가 오히려 시각을 파손하는 특정 패턴 — `bg-clip-text` 텍스트 그라디언트, 의도적 다크 서피스(`surface-inverse`) 위에 중첩되는 다크 패널, 항상-흰 pill/mark 위 고정 다크 텍스트 등 — 은 `docs/03-guides/design-tokens.md`에 미치환 근거를 기록하는 것을 조건으로 예외적 잔존을 허용한다.
3. 다크모드(`dark:`) 진입 시, 텍스트와 배경의 채도 충돌을 차단하기 위한 명도 보정(Lightness Compensation) 처리를 의무적으로 적용한다.

### 제16조 (정보 밀도 제어 및 레이아웃 숨통 원칙)
1. 모든 대시보드 카드 및 데이터 컨테이너 컴포넌트는 정보를 좁은 고정 영역에 억지로 구겨 넣지 않고, 내용물의 물리적 한계 용량에 따라 레이아웃이 안전하게 적응하는 유연한 숨통(Breathing Space) 구조를 고수한다.
2. 카드 내 텍스트가 길어져 레이아웃이 깨지는 현상을 방지하기 위해 모호한 여백 비율 수치 강제 대신, 다중 행 말줄임(line-clamp) 처리와 마우스 호버 시 툴팁(Tooltip) 노출 패턴을 적용하고, 긴 영문/URL에 대해서는 자동 줄바꿈(overflow-wrap: break-word) 처리를 의무화하여 시각적 그리드 정렬을 유지한다.
3. 한정된 컴포넌트 내에 세부 데이터가 중복 표출될 우려가 있을 경우, 필수 핵심 지표만 우선적으로 부각시키는 "선택적 계층 구조(Selective Hierarchy)"를 적용하고 상세 설명은 툴팁(Tooltip) 또는 점진적 상세(Disclosure) 패턴으로 유연하게 이격한다.

---

## 제9장 부칙 (Supplementary Provisions)

### 제17조 (시행일)
본 헌법은 공포된 즉시 효력을 발생하며, 모든 프론트엔드 개발 및 UI 개선 작업의 최상위 지침으로 적용된다.
