# 프론트엔드 UI/UX 정밀 감사 리포트

> **감사 일자**: 2026-07-10 &nbsp;|&nbsp; **대상**: `frontend/` (Next.js 16 · React 19 · Tailwind 4 · 122 routes · 354 tsx · 144 ts)
> **방법**: 9개 관점 병렬 팬아웃 → 각 발견 적대적 재검증(CONFIRMED/PLAUSIBLE/REFUTED) → 종합 (73 에이전트, 3.6M tokens)
> **결과**: 60개 검증 통과 + 3개 오탐 기각 &nbsp;|&nbsp; **종합 등급**: **B− (as delivered)**
> **준거**: [프론트엔드 디자인·UX 헌법](../../.agent/knowledge/frontend-ux-constitution/artifacts/constitution.md) 17조 (제3·5·6·8·9·10·12·13·16조 집중)
> **인터랙티브 리포트**: https://claude.ai/code/artifact/a8d16159-0403-4020-bc49-69a3b4947dd5

---

## 0. 총평 (Executive Summary)

토큰 레이어·Radix primitive·reduced-motion 대응·PPR 설정까지 갖춘 **성숙한 디자인 시스템**이다. 문제는 시스템의 부재가 아니라 **실행의 드리프트와 중복**이다. 두 개의 구조적 회귀가 지배적이다.

1. **다크모드는 사용자 토글 기능인데도 전역적으로 깨져 있다** — `.dark` slate 토큰 리맵 오류(theme-01)가 모든 Dialog/Popover/드로어를 흰 패널로 만들고, 차트·결재 허브·테이블 빈 상태·에러 경계·세션 모달이 그 위에 라이트 값을 하드코딩한다.
2. **코드베이스가 "모든 것을 2~3개씩" 싣는다** — 토스트 2종이 상충 위치에서 동시 발화, 커맨드 팔레트 2개가 Cmd+K에 동시 개방, 모달 3종·테이블 3종·Skeleton 2종. 같은 동작이 페이지마다 다르게 보이고 동작한다.

가장 날카로운 리스크는 **안전 크리티컬 표면의 접근성**이다 — 파괴적 확인 다이얼로그(13개 콜사이트)와 모든 손수-제작 오버레이에 dialog role·focus trap·Escape가 없어 키보드/스크린리더 사용자가 삭제를 안전하게 확인할 수 없다. 다행히 아키텍처 부패는 아니며, **최고 임팩트 수정 대부분이 작고 국소적**이다.

---

## 1. 관점별 진단 (Vitals)

| 관점 | 등급 | 발견 | 핵심 소견 |
|---|:---:|:---:|---|
| 디자인 토큰 · 테마 | **C** | 7 | semantic 토큰 레이어는 실존하나, 단일 `.dark` slate 리맵 오류가 다크모드의 모든 Dialog/Popover를 전역 파손. 상태/차트/허브 색이 raw hex로 토큰 우회. |
| 접근성 (WCAG) | **C−** | 7 | 헤더 아이콘 버튼 라벨링·axe 배선은 양호하나, 확인/드로어/세션 오버레이에 dialog role·focus trap·Escape 부재. axe는 2/122 라우트만·대비 규칙 비활성. |
| 성능 · 로딩 UX | **B−** | 5 | PPR·code-split·reduced-motion 등 기반은 탄탄. 그러나 렌더블로킹 CDN 폰트, 첫 페인트 전 auth 대기, 전체화면 로더, `mode=wait`로 스스로의 이점을 반납. |
| 반응형 · 모바일 | **C+** | 6 | 모바일 드로어·카드 폴백 등 올바른 패턴 보유. 그러나 1024–1279px 도메인 전환 사각지대, 폰에서 붕괴하는 게시판 캘린더, 6열+ 카드 컬럼 무단 드롭. |
| 컴포넌트 일관성 | **C** | 6 | canonical 컴포넌트는 좋으나 토스트·팔레트·모달·테이블·Skeleton·배지가 2~3중. 페이지 간 불일치와 실제 버그 유발. 통합이 최대 지렛대. |
| 인터랙션 피드백 | **C+** | 7 | 피드백 도구는 풍부하나 불일치·다크 파손: 중복 에러 토스트, 두 토스트 위치, 개발자 은어 빈 상태, 프로덕션에서 조용히 실패하는 에러 경계 복구 경로. |
| 내비게이션 · IA | **C+** | 7 | 팔레트 2개가 Cmd+K 동시 발화, ScrollToTop이 뒤로가기 복원 무력화, 라우트 camelCase/kebab 혼재, 게시판 중복 라우트. |
| 폼 · 데이터 입력 | **C** | 7 | zod·useAppForm 스캐폴딩은 견고하나 사용자 대면 실행이 취약: 가짜 업로드 완료, 폼을 제출하는 삭제 버튼, 영어 은어·raw DTO 코드 라벨, UI 약속보다 약한 검증. |
| 시각 위계 · 밀도 | **C+** | 8 | `rounded-full`→`rounded-lg` 회귀로 원형 UI가 전역에서 사각형, H1 4종, radius 8→40px 난립, 한국어 극단 tracking. 저비용·광범위 임팩트. |

---

## 2. 교차 테마 (큰 지렛대)

**T1 · 다크모드가 토글되지만 구조적으로 전역 파손** — 단일 slate 토큰 리맵 오류가 모든 공유 Radix Dialog/Popover를 깨고, 긴 꼬리의 컴포넌트가 그 위에 라이트 hex를 하드코딩. 근원 하나(theme-01)+토큰 스왑 세트로 white-on-white·비가시 텍스트 결함 한 클래스를 동시 복구.
`theme-01 · theme-02 · theme-03 · badge-status-01 · modal-divergence-01 · feedback-03 · feedback-04 · feedback-06`

**T2 · 포크된 컴포넌트 시스템이 불일치와 실버그를 생산** — 토스트/팔레트/모달/테이블/Skeleton이 2~3중. 피드백의 위치·언어가 불안정하고, 포크가 구체적 결함(이중 에러 토스트·팔레트 중첩)을 유발. 통합이 최고 ROI 구조 투자.
`toast-01 · feedback-01 · feedback-02 · nav-01 · modal-divergence-01 · table-stack-01 · skeleton-dup-01`

**T3 · 안전 크리티컬 다이얼로그가 가장 접근성 낮은 표면** — 파괴적 확인 모달(13파일)·알림 드로어·세션 만료 경고가 전부 손수-제작 오버레이로 dialog role·focus trap·Escape·복원이 없음. Radix AlertDialog/Dialog가 이미 의존성.
`a11y-01 · a11y-02 · a11y-confirm-modal-01 · feedback-05 · feedback-06 · a11y-03`

**T4 · 개발자 은어·미번역 카피가 한국어 정부 UI에 노출** — 영어 개발 라벨(Commit Knowledge/Abort), raw DTO 컬럼 코드(sndngTelno), 정상 빈 상태에 놀라운 내부 은어(ERROR_STREAM), 한국어에 무의미한 uppercase+극단 letter-spacing.
`forms-04 · forms-05 · feedback-03 · vhd-03 · forms-07`

**T5 · 시스템적 시각 충실도 회귀가 'Unified Premium'을 훼손** — 전역 `rounded-full`→`rounded-lg` 미끄러짐이 스피너·상태점·아바타·브랜드 마크를 거의 모든 페이지에서 사각형으로 렌더. 제목 4종 H1, radius 8→40px 점프.
`vhd-01 · vhd-02 · vhd-05 · vhd-04 · vhd-07`

**T6 · 반응형·로딩 UX가 프레임워크 이점을 스스로 반납** — 실제 뷰포트 대역이 깨지고, App Router와 싸움(레이아웃이 첫 페인트 전 auth 대기, 전체화면 로더, mode=wait, ScrollToTop이 뒤로가기 복원 무력화).
`resp-01 · nav-03 · resp-02 · resp-03 · perf-02 · perf-03 · perf-04 · nav-04`

---

## 3. 우선순위 로드맵

### 3.1 즉효 개선 (Quick Win — 고임팩트·저비용, 대부분 한 줄~한 파일)

| # | 수정 | 파일 | 효과 | id |
|:--:|---|---|---|---|
| 1 | 중복 api-error 토스트 제거 (모든 에러 2회 표시) | `api-error-notifier.tsx:20` (+`toast.tsx:49-62`) | 이중 스택 제거, 에러 피드백 신뢰 회복 | feedback-01 |
| 2 | 결재 허브 라이트-섬 배경 → semantic 토큰 | `ApprovalHubClient.tsx:202` | High 다크결함 토큰 한 줄 해소 | theme-03 |
| 3 | 전역 페이지 전환 `mode="wait"` 제거 | `page-transition.tsx:11` | 네비마다 ~0.4s 지연 제거 | perf-04 |
| 4 | 파일 삭제 X 버튼에 `type="button"` | `standard-file-uploader.tsx:195` | 우발 폼 제출 버그 수정 | forms-02 |
| 5 | ScrollToTop 제거 → 뒤로가기 스크롤 복원 | `scroll-to-top.tsx:13` | 필터/정렬/뒤로가기 top 점프 제거 | nav-04 |
| 6 | 모바일 6열+ 컬럼 무단 드롭 중단 | `standard-data-table.tsx:141-156` | 폰 사용자 비가시 데이터 손실 방지 | resp-03 |
| 7 | 알림/닫기/삭제 아이콘 버튼 라벨링 | `app-notification-drawer.tsx:101` | SR 사용자 드로어 조작 가능 | a11y-03, a11y-08 |
| 8 | 비밀번호 규칙 실제 강제 (min(8)) | `UserManageForm.tsx:30` | 빈/1자 비밀번호 생성 보안 갭 차단 | forms-03 |
| 9 | 두 Skeleton primitive 단일화 | `skeleton.tsx` ×2 | 로딩 placeholder 명도 일관화 | skeleton-dup-01 |
| 10 | 무효 CSS·미정의 popover 토큰 수정 | `globals.css:293` (+`popover.tsx:22`) | 죽은 선언 제거, 라벨 정렬, popover 테마색 | theme-04, theme-07 |
| 11 | 허브 부제 10px/900 → 13–14px/400 | `globals.css:115,225-227` | 허브 설명 가독화(고령 사용자) | vhd-04 |

### 3.2 구조 투자 (Strategic — 근원 수정으로 한 클래스 결함 제거)

1. **다크모드를 근원에서 복구 후 하드코딩 값을 semantic 토큰으로 스윕** `[large]` — `globals.css:162-167`의 bare-HSL slate 리맵 삭제(또는 `hsl()` 래핑)+공유 primitive(`dialog.tsx:64`, `popover.tsx:22`) 수정이 전역 Dialog/Popover/드로어를 해제. 이어 차트(theme-02)·배지(badge-status-01)·모달(modal-divergence-01)·테이블(feedback-03)·에러경계(feedback-04)·세션모달(feedback-06) 스윕.
2. **모든 오버레이를 Radix Dialog/AlertDialog로 통합** `[large]` — confirm-modal(13콜사이트, promise API 유지)·알림 드로어·세션 경고를 focus trap·Escape·aria·복원 제공하는 Radix로 재구현. WCAG 실패를 닫고 3종 분기 backdrop/z-index를 하나로 붕괴.
3. **토스트 1종(sonner)·팔레트 1개로 확정, 포크 삭제** `[large]` — `app/components/ui/toast.tsx` 삭제, ~48 useToast() codemod, 커스텀 ToastProvider 제거. Cmd+K 팔레트 2개 중 하나 unmount.
4. **Pretendard를 next/font/local로 self-host, CDN @import 제거** `[moderate]` — 렌더블로킹·FOUT/CLS·프라이버시 누수·CSP 실패를 한 변경으로 제거.
5. **Spinner·StatusDot primitive 도입, H1/페이지 제목 통일** `[moderate]` — rounded-full 복원+단일 컴포넌트로 재드리프트 차단.
6. **반응형 사각지대 봉합 + App Router 스트리밍 회수** `[moderate]` — 1024–1279px 도메인 스위처 갭, 게시판 캘린더 반응형, auth 비차단(userPromise), 로더를 콘텐츠 컬럼 내부로.
7. **a11y 게이트·에러 경계에 실제 커버리지 부여** `[moderate]` — 공용 인증 fixture에 axe·대비 규칙 복원, segment/global-error.tsx 추가, 구조화 property로 에러 분류.
8. **파일 업로더를 실제 업로드 상태에 정합** `[large]` — 가짜 진행률 제거, 확정 응답에만 완료; 지연 업로드면 '첨부 대기'.
9. **테이블·라우트 명명 포크 통합** `[large]` — dead DataTable 삭제, 8페이지 마이그레이션, ESLint 가드, kebab 라우트 표준화+redirect, 게시판 canonical URL.

---

## 4. 전체 발견 (60건)

> 표기: `id` · **심각도**(high/medium/low) · **난이도**(quick-win/moderate/large) · **검증**(✓ CONFIRMED / ~ PLAUSIBLE) · 준거 조항

### 4.1 디자인 토큰 · 테마 (C · 7건)

**theme-01** · high · large · ✓ · 제6조 — **`.dark` slate 토큰 리맵 오류 → 다크모드 전역 파손** `globals.css:162-167`
- 영향: `.dark`에서 `--color-slate-{600..950}`를 `hsl()` 없이 raw HSL로 재할당 → 모든 Radix Dialog/Popover·알림 드로어·로그인 카드·커맨드 센터가 다크모드에서 흰 패널+흰 텍스트(사실상 white-on-white). 앱 전역 블로킹 결함.
- 개선: raw HSL 리맵 제거 또는 `hsl()` 래핑. 더 낫게는 리맵 삭제하고 공유 primitive(dialog:64, popover:22)를 semantic surface 토큰(`bg-card`/`bg-background`/`text-foreground`)으로 전환.

**theme-02** · high · moderate · ✓ · 제6조 — **Recharts 축/그리드 색 hex 하드코딩 → 다크에서 차트 판독 불가** `standard-chart-wrapper.tsx:54`
- 영향: 모니터링·대시보드·통계 허브 다크모드 시 `#475569`/`#64748b` 축 라벨이 near-black 위 dark-gray(비가시), `#f1f5f9` 그리드는 눈부신 흰 선.
- 개선: 차트 chrome을 테마 변수 기반으로(`stroke=hsl(var(--border))`, `fill=hsl(var(--muted-foreground))`). 단일 chart-token 맵.

**theme-03** · high · quick-win · ✓ · 제6조 — **결재 허브가 라이트 배경 하드코딩, dark variant 부재** `ApprovalHubClient.tsx:202`
- 영향: 다크모드 시 결재 허브 전체(`min-h-screen`)가 밝은 near-white 시트로 렌더 — 다크 콘텐츠 뒤 명백한 라이트 섬.
- 개선: `bg-[#F8FAFC]`를 semantic `bg-background`/`bg-muted`로 교체. 단일 `--overlay` 토큰 도입.

**theme-04** · low · quick-win · ~ · 제6조 — **`.hub-tech-label`에 무효 CSS `items-center: center;`** `globals.css:293`
- 영향: tech-label이 `align-items`를 못 받아 `_` 마커와 텍스트 수직 미정렬. SSOT 유틸 레이어가 검증 없이 작성됐다는 신호.
- 개선: `items-center: center;` → `align-items: center;` (한 줄). stylelint 패스로 무효 속성명 차단.

**theme-05** · medium · moderate · ~ · 제10조 — **Pretendard 외부 CDN `@import` — CSP/오프라인 취약·FOUT** `globals.css:1`
- 영향: CSP 제한/에어갭에서 jsdelivr 차단 시 주 UI 폰트 실패(레이아웃 시프트·한글 렌더 상이). 개방망에서도 최상단 @import가 첫 페인트 블로킹.
- 개선: `next/font/local`로 self-host, CDN @import 제거, CSP에서 jsdelivr 제거. (perf-01과 동일 근원)

**theme-06** · low · moderate · ~ · 제6조 — **상태색이 semantic 토큰 우회 (raw amber/emerald/rose)** `HubStatusBadge.tsx:28`
- 영향: 같은 'warning'이 화면마다 다른 색조/강도. amber-400-on-amber/20 배지는 저시력 사용자 판독 곤란(제15조 대비).
- 개선: 상태색을 semantic 토큰(`bg-warning/10 text-warning`) 또는 공유 statusStyles 맵으로. 배지 텍스트 darken.

**theme-07** · low · quick-win · ✓ · 제6조 — **popover/select가 미정의 `--popover` 토큰 참조** `popover.tsx:22`
- 영향: popover/select 표면에 전용 테마 foreground 토큰이 없어 색이 상속에 좌우. shadcn 토큰 슬롯 비어있음.
- 개선: `--popover`/`--popover-foreground`(light+.dark) 추가·배선, `bg-popover text-popover-foreground`로.

### 4.2 접근성 (WCAG) (C− · 7건)

**a11y-01** · high · moderate · ✓ · 제9조 — **앱 전역 확인 다이얼로그에 role·focus trap·Escape·복원 없음** `confirm-modal.tsx:46`
- 영향: 파괴적 확인 시 SR 미고지, 포커스가 배경 컨트롤에 잔류, Tab이 오버레이 뒤로, Escape 취소 없음. 키보드/시각장애 사용자가 삭제를 안전하게 확인·취소 불가.
- 개선: Radix AlertDialog로 교체 또는 role=dialog·aria-modal·aria-labelledby, 열릴 때 확인 버튼 포커스, Tab trap, Escape 취소, 닫힐 때 호출 요소 복원.

**a11y-02** · medium · large · ✓ · 제9조 — **손수-제작 모달/드로어에 focus trap·Escape·복원 부재** `app-notification-drawer.tsx:72`
- 영향: 벨 드로어·세션 프롬프트가 배경에 포커스 남김, Tab이 숨은 콘텐츠로, Escape 없음, 닫힐 때 포커스 유실. 세션 만료를 키보드/AT 사용자가 도달조차 못할 수 있음.
- 개선: 모든 오버레이를 Radix Dialog/Drawer로 표준화.

**a11y-03** · medium · quick-win · ✓ · 제9조 — **드로어·세션 경고의 아이콘 전용 버튼에 접근명 없음** `app-notification-drawer.tsx:101`
- 영향: SR 사용자는 라벨 없는 'button'을 듣고 기능을 알 수 없음. header.tsx는 올바르게 라벨링 → 컨벤션이 아닌 불일치.
- 개선: 각각 aria-label('알림 센터 닫기'·'알림 전체 삭제'·'세션 경고 닫기').

**a11y-05** · medium · quick-win · ✓ · 제9조 — **StandardDataTable 행 `<tr>`에 role=button → 행 시맨틱 상실** `standard-data-table.tsx:70`
- 영향: SR 사용자가 행 도달 시 'row X of Y' 맥락·열 헤더 연결 상실 — generic button으로 고지.
- 개선: role=button 제거, 주 셀 콘텐츠를 실제 link/button으로, 또는 grid 패턴으로 승격.

**a11y-06** · medium · moderate · ✓ · 제9조 — **axe가 122개 중 2개 라우트만·인증 스캔 color-contrast 비활성** `e2e/04-quality-resilience.spec.ts:93`
- 영향: 자동 a11y 게이트가 관리 앱 거의 미커버, WCAG 4.5:1 대비가 인증 페이지에서 CI 미강제. 120개 라우트 회귀 무검출.
- 개선: 공용 인증 fixture에 axe 추가, color-contrast 비활성 중단(근본 대비 수정).

**a11y-07** · low · moderate · ~ · 제9조 — **사이드바 chevron이 `<a>` 안 non-focusable `<div onClick>`** `NavItem.tsx:160`
- 영향: 자식 메뉴를 키보드/SR로 확장·축소 불가, 앵커 안 클릭 타깃(무효 중첩). 깊은 트리 부분 도달 불가.
- 개선: chevron을 앵커 밖 형제 `<button aria-expanded aria-controls>`로 이동.

**a11y-08** · low · quick-win · ✓ · 제9조 — **알림 벨 접근명이 미읽음 수 누락 (색/배지-only 신호)** `header.tsx:153`
- 영향: SR 사용자는 '알림'만 듣고 N건 미읽음 전달받지 못함.
- 개선: 동적 라벨(`알림, 읽지 않음 ${n}건`), 장식 Badge에 aria-hidden.

### 4.3 성능 · 로딩 UX (B− · 5건)

**perf-01** · high · moderate · ✓ · 제10조·제8조 — **주 폰트가 렌더블로킹 외부 CDN @import — FOUT/CLS·프라이버시** `globals.css:1`
- 영향: 최상단 @import는 렌더블로킹·직렬(globals.css→파싱→@import→원격 CSS→woff2). 한국어 포털 매 페이지 FOUT+CLS. 매 방문 IP/UA를 jsdelivr에 유출, 첫 렌더 3rd-party SPOF.
- 개선: `next/font/local`로 self-host → preload·size-adjust·font-display:swap. @import 제거, CSP에서 cdn.jsdelivr.net 제거.

**perf-02** · medium · moderate · ~ · 제3조·제8조 — **루트 레이아웃이 shell 렌더 전 auth/me 네트워크 대기** `layout.tsx:83`
- 영향: 매 하드로드마다 chrome 전 '보안 세션 확인 중' 전체화면 splash를 백엔드 왕복 동안 응시. App Router 지속-shell 이점·PPR 무력화.
- 개선: 레이아웃 본문에서 user await 금지. userPromise를 Providers에 넘겨 Suspense에서 해소.

**perf-03** · low · quick-win · ~ · 제8조 — **유일한 라우트 로딩이 지속 shell을 덮는 전체화면 오버레이** `loading.tsx:3`
- 영향: 데이터 fetch 라우트로의 모든 네비가 헤더·사이드바 포함 전체 뷰포트를 splash로 덮음. 하위 라우트에 국소 skeleton 없음.
- 개선: 로더를 콘텐츠 컬럼 내부 inline skeleton으로. 주요 허브에 세그먼트별 loading.tsx.

**perf-04** · medium · quick-win · ✓ · 제8조 — **PageTransition의 `mode=wait`가 매 네비에 ~0.4s 게이트 추가** `page-transition.tsx:11`
- 영향: 고트래픽 관리 도구의 모든 네비가 새 페이지 시작 전 최대 ~0.4s 강제 exit 애니메이션에 과금 — 실제 fetch 위에 체감 지연 누적.
- 개선: `mode=wait` 제거(오버랩) 및/또는 duration ~0.15–0.2s.

**perf-05** · low · moderate · ~ · 제3조 — **일부 라우트가 full 'use client' page.tsx로 mount 후 fetch** `note/page.tsx:18`
- 영향: JS 번들 다운→하이드레이트→데이터 요청 순 — server 렌더 대비 클라이언트 왕복 한 번만큼 빈 화면 추가.
- 개선: 표준형(server page.tsx가 fetch 시작+얇은 client island)으로 전환.

### 4.4 반응형 · 모바일 (C+ · 6건)

**resp-02** · high · moderate · ✓ · 제5조 — **게시판 캘린더가 고정 7열 그리드 → 폰에서 붕괴** `BoardTemplates.tsx:333`
- 영향: 폰에서 사실상 사용 불가: 날짜 셀 ~25px 슬라이버, 콘텐츠 잘림, 월 헤더 오버플로우.
- 개선: `grid-cols-1 sm:grid-cols-7` 또는 `overflow-x-auto`+`min-w-[640px]`. 375px 검증.

**resp-01** · medium · moderate · ✓ · 제5조 — **1024–1279px(lg→xl) 구간 도메인 내비 도달 불가** `header.tsx:100 · sidebar.tsx:111`
- 영향: 소형 노트북·아이패드 가로·분할 화면에서 상위 도메인 전환 컨트롤 전무 — 리사이즈나 Cmd+K 외엔 한 도메인에 갇힘.
- 개선: 햄버거를 `xl:hidden` 또는 top nav를 `lg:flex`로. 1100px 검증.

**resp-03** · medium · quick-win · ✓ · 제16조 — **모바일 카드가 6번째 이후 컬럼을 조용히 드롭** `standard-data-table.tsx:141-156`
- 영향: 5열 초과 밀집 테이블(사용자·권한·코드·로그)에서 모바일 사용자가 데이터 컬럼 통째 상실, 'more' 어포던스 없음.
- 개선: 전 컬럼 렌더(`columns.slice(1)`) 또는 명시적 'expand for more'. 7열 375px 검증.

**resp-04** · low · quick-win · ~ · 제9조 — **헤더 액션 버튼 36px — 44px 터치 타깃 미달** `button.tsx:29 · header.tsx`
- 영향: 44px(Apple)/48dp(Material) 미만, 특히 모바일 유일 내비 열기 수단 햄버거 히트 곤란.
- 개선: 주 헤더 아이콘 버튼에 모바일 ≥44px 히트영역(`h-11 w-11`).

**resp-05** · low · moderate · ~ · 제16조 — **허브 제목이 고정 text-4xl/5xl/6xl+픽셀 max-width** `UserOrgHubClient.tsx:670 외`
- 영향: 큰 고정 제목과 `max-w-[350px]`가 폰에서 오버플로우. UserOrg 상세 헤더는 `<main>` overflow-x-hidden에 잘림.
- 개선: 반응형 PageHeader 또는 `text-2xl sm:text-3xl md:text-5xl`, fluid max-w. 360px 검증.

**resp-06** · low · quick-win · ~ · 제16조 — **고정 min-h-[800/850px]가 모바일에 빈 스크롤 공간** `SecurityHubClient.tsx:514 외`
- 영향: pane이 비거나 짧을 때 800–850px 강제 → 죽은 스크롤 영역.
- 개선: `min-h-0 lg:min-h-[850px]`. 390px 검증.

### 4.5 컴포넌트 일관성 (C · 6건)

**a11y-confirm-modal-01** · high · moderate · ✓ · 제9조 — **파괴적 확인(13파일)에 dialog 시맨틱 전무** `confirm-modal.tsx:47`
- 영향: SR 미고지·포커스 미이동으로 파괴적 동작을 모르고 확인 가능. Escape 없음, focus 미trap. 가장 안전 크리티컬한 삭제 확인의 WCAG 2.1 AA 실패.
- 개선: Radix dialog primitive 위에 재구현 또는 AlertDialog. promise 기반 `confirm()` API 유지해 13콜사이트 불변.

**toast-01** · medium · large · ✓ · 제6조 — **토스트 2종 동시 마운트 — 위치·스타일 페이지마다 상이** `toast.tsx:67 + GlobalUIComponents.tsx:17`
- 영향: 작업 A는 bottom-right, B는 동일 의미 성공이 top-center에 다른 색/애니로. 확인 피드백에 안정적 위치 없음. 커스텀 하드코딩 색은 다크모드도 깸.
- 개선: sonner 단일화, `app/components/ui/toast.tsx` 삭제, ~48 useToast() codemod, 커스텀 ToastProvider 제거.

**modal-divergence-01** · medium · large · ✓ · 제6조 — **모달 3종 backdrop·z-index 상이 → 시각 불일치+스태킹 위험** `standard-modal.tsx:59 / dialog.tsx:42 / confirm-modal.tsx:47`
- 영향: backdrop이 blur+80% vs 평면 near-black 95%/90%로 불일치. StandardModal(z-1000) 위 Radix dialog(z-50)가 뒤로 렌더돼 깨져 보임.
- 개선: Radix dialog로 표준화, 단일 overlay 토큰(`bg-background/80`)·단일 z-index 스케일. 하드코딩 `bg-[#020617]` 제거.

**badge-status-01** · low · moderate · ~ · 제6조 — **Badge vs status-badge 색 분기, fallback 다크 미대응** `status-badge.tsx:9-16`
- 영향: 'success'가 Badge는 진한 emerald, StatusBadge는 옅은 green-100. 맵 밖 상태는 `bg-gray-100`(다크 오버라이드 없음) → 다크모드 near-invisible chip.
- 개선: status-badge를 Badge semantic variant로 흡수. 최소한 fallback에 `dark:` 추가.

**table-stack-01** · low · large · ~ · 제16조 — **테이블 3종: canonical 50 · raw 8 · dead 1** `common/DataTable.tsx (dead) + standard-data-table.tsx`
- 영향: 50페이지는 일관된 정렬·빈상태·sticky 헤더, 8페이지는 그 거동 부재/임의. dead DataTable은 함정.
- 개선: `components/common/DataTable.tsx`+테스트 삭제, raw 8페이지 마이그레이션, ESLint no-restricted-import.

**skeleton-dup-01** · low · quick-win · ✓ · 제8조 — **동명 Skeleton 2종 opacity 상이 + 별도 TableSkeleton** `components/ui/skeleton.tsx:10 vs app/components/ui/skeleton.tsx:9`
- 영향: import 경로에 따라 로딩 placeholder가 두 회색 명도로 깜빡임. 동명 export가 오import 유발.
- 개선: 하나 삭제 후 재export — 단일 Skeleton·단일 opacity.

### 4.6 인터랙션 피드백 (C+ · 7건)

**feedback-01** · medium · quick-win · ✓ · 제13조 — **모든 API 실패가 동일 에러 토스트 2회 (중복 리스너)** `api-error-notifier.tsx:20`
- 영향: 모든 4xx/5xx에서 동일 메시지가 bottom-right에 2회 스택 — 두 실패처럼 보여 신뢰 저하.
- 개선: 'api-error' 이벤트 단일 소유자(ToastProvider 리스너 또는 `<ApiErrorNotifier/>` 제거). '1 dispatch→1 toast' 테스트.

**feedback-02** · medium · moderate · ✓ · 제13조 — **두 토스트 시스템이 상충 위치에 앱 전역 마운트** `GlobalUIComponents.tsx:17`
- 영향: 저장 성공은 top-center(sonner), 실패 api-error는 bottom-right(커스텀). 사용자가 두 모서리 스캔, 시각 언어 불일치.
- 개선: sonner로 표준화, 커스텀 api-error 경로를 sonner로, 커스텀 컨테이너 제거.

**feedback-03** · medium · moderate · ✓ · 제6조 — **공유 테이블 빈/에러 상태가 다크 파손+에러 은어, 고친 twin 미사용** `standard-data-table.tsx:466`
- 영향: 약 절반 페이지에서 정상 빈 목록이 다크 저대비+시스템 에러 문구+전체 reload 유도. `ERROR_STREAM`/`database session` 은어 노출.
- 개선: `status-displays.tsx`의 dark-aware 버전 import. 빈 상태 카피 차분하게+필터 리셋, reload는 실제 에러 브랜치에만.

**feedback-04** · medium · moderate · ✓ · 제12조 — **에러 경계가 프로덕션에서 stripped되는 메시지 문자열로 분류·라이트 전용** `admin/error.tsx:37`
- 영향: '세션 만료→재로그인'·'권한 없음' 복구 화면이 프로덕션 서버측 실패에 미표시 — generic 문구+재인증 경로 없음. 다크모드 저대비.
- 개선: 구조화 property(statusCode/cause)로 분류. slate-* 리터럴을 테마 토큰으로.

**feedback-05** · medium · moderate · ✓ · 제9조 — **파괴적 확인 다이얼로그에 시맨틱·focus trap·Escape/backdrop 해제 부재** `confirm-modal.tsx:46`
- 영향: 제품 최고 안전 크리티컬 다이얼로그가 가장 접근성 낮음. 포커스 이탈·Escape/외부클릭 취소 없어 파괴적 동작 중간에 갇힘.
- 개선: 접근성 있는 StandardModal/Radix 셸 재사용, 초기 포커스는 취소 버튼(안전 기본), Escape+overlay-click을 handleCancel로.

**feedback-06** · medium · moderate · ✓ · 제9조 — **세션 만료 카운트다운이 SR 미고지·순수 라이트 모드** `session-expiry-warning.tsx:151`
- 영향: SR 사용자는 만료 임박/카운트다운 고지 못 받고 작업 중 조용히 로그아웃. 다크모드 사용자는 all-white 모달.
- 개선: role=dialog·aria-modal, 초기 포커스 '세션 연장', 카운트다운을 aria-live=polite. 리터럴을 테마 토큰으로.

**feedback-07** · low · moderate · ~ · 제12조 — **122 라우트에 error 경계 2개·global-error 없음** `error.tsx:1`
- 영향: survey/approvals 등에서 던진 에러가 전체 페이지 에러 화면으로 붕괴, 루트 레이아웃 에러엔 스타일 fallback 없음.
- 개선: 고트래픽 비-admin 도메인에 segment error.tsx(in-place retry), `app/global-error.tsx`.

### 4.7 내비게이션 · IA (C+ · 7건)

**nav-01** · high · moderate · ✓ · 제9조 — **커맨드 팔레트 2개가 Cmd/Ctrl+K에 동시 개방** `GlobalUIComponents.tsx:16 · providers.tsx:89`
- 영향: shadcn/cmdk 아래, API 기반 GlobalCommandCenter(z-[10000]) 위 — 두 focus trap 충돌로 키스트로크가 숨은 다이얼로그로, Esc가 하나만 닫아 갇힘. 'jump to anything' 핵심 어포던스 파손.
- 개선: 팔레트 하나(GlobalCommandCenter) 유지, 나머지 unmount. Cmd+K 리스너 하나만 토글하도록 가드.

**nav-03** · medium · moderate · ✓ · 제5조 — **lg~xl(1024–1279px)에 상위 도메인 스위처 부재** `header.tsx:100`
- 영향: 아이패드 가로·분할 화면·다수 1280 이하 노트북에서 기본 도메인에 갇힘. (resp-01과 연계)
- 개선: 헤더 도메인 nav를 `lg:flex`로 또는 사이드바 상단 도메인 스위처.

**nav-04** · medium · quick-win · ~ · 제8조 — **ScrollToTop이 back/forward 복원 무력화·매 필터/페이지에 top 점프** `scroll-to-top.tsx:13`
- 영향: 긴 목록 깊이 스크롤 후 뒤로가기 → 최상단으로 튕겨 자리 상실. 페이지네이션/정렬/필터마다 top 스냅. 데이터 중심 화면 광범위 회귀.
- 개선: 컴포넌트 제거, 네이티브/Next 복원. 필요 시 실제 path 변경에만 스코프(searchParams deps 제거).

**nav-05** · low · moderate · ~ · 제8조 — **사이드바가 client mount 전까지 빈 렌더 → blank-then-pop** `NavItem.tsx:183`
- 영향: 메뉴 데이터가 SSR에 있는데도 좌측 내비가 먼저 blank로, 하이드레이션 뒤 pop-in — 매 로드 레이아웃 시프트.
- 개선: 내비를 서버 렌더+hydration-safe active(isMounted 게이팅 없이 usePathname), 또는 null 대신 skeleton.

**nav-06** · low · large · ✓ · 제4조 — **122 라우트에 camelCase·kebab-case 혼재** `scraps/selectScrapList vs address-book/select-address-book-list`
- 영향: URL은 사용자 가시·공유됨. verb-prefix legacy 세그먼트(insert*/select*)가 경로 예측 불가·미완 마이그레이션 신호.
- 개선: kebab-case 리소스 지향(`scraps/[id]`, `scraps/new`)+legacy에서 redirect.

**nav-07** · low · large · ~ · — **게시판 모듈 중복 목적지 (상세 3·작성 2·목록 2 라우트)** `community/boards/`
- 영향: '게시물 보기'·'글쓰기' canonical URL 없어 메뉴·팔레트·breadcrumb·버튼이 각기 다른 페이지 지시. active-state·breadcrumb 신뢰 불가.
- 개선: 액션당 canonical 라우트(`boards`, `boards/new`, `boards/[id]`)+중복 redirect.

**nav-08** · low · moderate · ~ · 제9조 — **breadcrumb 2종+메뉴-only fallback → 깊은 페이지 위치 부정확** `DynamicBreadcrumb.tsx:53`
- 영향: 메뉴 트리에 없는 라우트가 'Home'만 표시 — 위치·상위 이동 불가. 수동 PageHeader trail은 스타일·라벨 드리프트.
- 개선: 단일 breadcrumb, 매치 없을 때 URL 세그먼트→휴먼 라벨 파생 fallback, 공유 레이아웃 1회 렌더.

### 4.8 폼 · 데이터 입력 (C · 7건)

**forms-01** · medium · large · ~ · 제13조·제7조 — **'표준' 파일 업로더가 가짜 진행률·거짓 '완료' 표시** `standard-file-uploader.tsx:36`
- 영향: 배너 이미지 드래그 시 진행 바가 차고 초록 체크 '완료'가 뜨지만 미업로드(Save 전까지 메모리). 이탈/제출 실패 시 첨부 유실 — 정부 기록 시스템에서 기만적 어포던스.
- 개선: 진행/상태를 실제 업로드(서버 액션/XHR) 기반으로, 확정 응답에만 'completed'. 지연 업로드면 중립 '첨부 대기'.

**forms-02** · medium · quick-win · ✓ · 제7조 — **파일 '삭제'(X) 버튼에 type 없어 폼 제출** `standard-file-uploader.tsx:195`
- 영향: 첨부를 X로 제거하면 폼 submit 핸들러 발화 — 검증+미완성 레코드 POST 가능. 모달이 예기치 않게 제출/닫힘.
- 개선: 삭제 버튼(및 내부 버튼)에 `type="button"`. 한 줄.

**forms-04** · medium · moderate · ✓ · 제7조 — **주 게시판 작성 폼이 영어 개발 은어 라벨·비가시 placeholder** `BoardRegistClient.tsx:201`
- 영향: 한국어 정부 작성 화면인데 제목 필드에 한국어 라벨 없고, 판독 불가 placeholder, submit/cancel이 `Commit Knowledge`/`Abort`. 필드 목적·필수 불명확.
- 개선: 평이한 한국어 라벨(제목·내용·저장·취소)+가독 placeholder. title input에 실제 가시 label 바인딩.

**forms-05** · medium · moderate · ✓ · 제7조·제13조 — **검증 토스트가 raw DTO 컬럼코드 노출·에디터 포커스 no-op** `useAppForm.ts:38`
- 영향: '필수 입력 항목입니다. / 항목: sndngTelno' 같이 내부 camelCase 컬럼명 유출. 에디터가 문제 필드일 때 auto-focus/scroll이 no-op(pstCn 부재).
- 개선: 필드 키→한국어 라벨 맵, 빈-콘텐츠 규칙을 zod로 접어 FormMessage 인라인. 비-input은 id/ref로 포커스.

**forms-03** · low · quick-win · ~ · 제7조 — **비밀번호 필드가 필수*·MIN_8 표시하나 zod 미강제** `UserManageForm.tsx:30`
- 영향: 관리자가 빈/1자 비밀번호로 사용자 생성 가능 — 보안 약점+표시와 실제의 불일치.
- 개선: create 모드는 `commonSchemas.password`(min(8)+복잡도)로 검증, edit만 optional.

**forms-06** · low · quick-win · ~ · 제7조 — **업로더가 초과 파일 조용히 폐기·accept 필터 무시** `standard-file-uploader.tsx:66`
- 영향: 배너 업로더(maxFiles=1)에 여러 이미지 드래그 시 첫 개만 남고 나머지 피드백 없이 사라짐. 비허용 타입 드롭도 조용히 수용.
- 개선: maxFiles 폐기 시 토스트, 드롭 파일을 accept로 검증.

**forms-07** · low · moderate · ~ · 제7조·제9조 — **검색 필터 라벨-입력 미연결·한국어 강제 대문자** `standard-search-filter.tsx:80`
- 영향: 필터 라벨 클릭이 포커스 안 됨(연결 부재), SR 미고지. 한국어에 UPPERCASE+wide tracking 강제로 어색한 간격. FormField 에러가 입력과 미연결.
- 개선: 생성 id+라벨 htmlFor 매칭, 한국어 toUpperCase/wide tracking 제거, aria-describedby/aria-invalid.

### 4.9 시각 위계 · 밀도 (C+ · 8건)

**vhd-01** · medium · moderate · ~ · 제1/2조·제8조 — **원형 UI(스피너·상태점·아이콘/로고 박스)가 전역에서 사각형** `loading.tsx:6-7 · MonitoringHubClient.tsx:51 · LoginClient.tsx:96`
- 영향: 스피너가 회전하는 둥근 사각형, 'live' 상태점이 squircle, 로그인 브랜드 마크·아이콘 배지가 눌린 사각형. 거의 모든 페이지 미완성 인상, 'Unified Premium' 모순.
- 개선: 전역 `rounded-full`→`rounded-lg`+`h-16/20`→`h-11` 미끄러짐 회귀로 취급. rounded-full 복원, 단일 `<Spinner>`(aspect-square+rounded-full)·`<StatusDot>` primitive.

**vhd-02** · medium · moderate · ~ · 제1/2조·제16조 — **통일된 페이지 제목(H1) 부재 — hub-title 토큰 우회 4종** `HubHeader.tsx:40 · page-header.tsx:50 · ApprovalHubClient.tsx:213`
- 영향: 가장 눈에 띄는 요소에 일관 정체성 없음 — 화면 이동 시 제목 크기·굵기 점프. heading-order 역전이 SR에 구조 오신호.
- 개선: 모든 제목을 단일 컴포넌트/토큰(`hub-title-main`/`<PageTitle>`) 경유, 단일 weight, 가시 제목이 첫 h1.

**vhd-05** · medium · moderate · ✓ · 제6조·제1조 — **카드 radius·클래스 난립 — 40px `rounded-[2.5rem]`가 토큰 무시** `ApprovalHubClient.tsx:242 외 · globals.css:120-122`
- 영향: 한 뷰에서 radius 8→16→40px, section 패딩 32/48px — 표면이 하나의 시스템으로 안 읽힘.
- 개선: 3개 radius 토큰+단일 카드 컴포넌트, `rounded-[2.5rem]`를 `rounded-[var(--radius-hub-section)]`로. 4개 hub-card-* 를 variant 하나로.

**vhd-06** · low · moderate · ✓ · 제6조·제16조 — **accent 색을 의미 아닌 장식으로 사용 (rainbow dashboard)** `AdminDashboardClient.tsx:159 외 · KnowledgeHubClient.tsx:447`
- 영향: 색이 단서로 신뢰 불가 — red/rose가 risk를, amber가 warning을 신뢰성 있게 신호 안 함. 색맹 사용자에 일관 매핑 없음.
- 개선: success/warning/destructive/info를 state에 예약, 인터랙티브 카드엔 단일 primary. 카테고리는 아이콘/라벨로.

**vhd-03** · low · moderate · ~ · 제16조·제9조 — **한국어에 극단 letter-spacing(0.3–0.4em)+무의미 uppercase 만연** `AdminDashboardClient.tsx:345 외 · loading.tsx:25`
- 영향: uppercase는 한글 no-op이나 0.3–0.4em tracking이 음절 블록을 벌려 라벨/eyebrow 가독성 저하. 자체 tight-tracking 토큰과 모순.
- 개선: wide tracking+uppercase를 짧은 라틴/eyebrow에만. `hub-eyebrow` 유틸(라틴 전용)+한글 노드 린트.

**vhd-04** · low · quick-win · ~ · 제9조·제16조 — **허브 부제가 10px/weight-900 한국어 문장 — 너무 작고 무거움** `globals.css:115,225-227 · HubHeader.tsx:44`
- 영향: 각 허브 설명 한 줄이 10px 초-black muted로 사실상 판독 불가, 특히 고령 정부 사용자.
- 개선: 부제를 ~13–14px·weight 400–500으로. 10px/900은 진짜 micro eyebrow 태그에만.

**vhd-07** · low · moderate · ~ · 제16조·제9조 — **'premium' 효과 과잉(거대 focus/hover ring·회전 로고·행 scale·blur)** `KnowledgeHubClient.tsx:173 외 · ApprovalHubClient.tsx:120`
- 영향: 24px focus·20px hover ring이 reflow/overlap 유발해 포커스 판독 곤란; 기울인 로고·scaling 행이 모션 churn. 무거운 blur+긴 fade가 체감 응답성 저하.
- 개선: focus ring 2–4px 솔리드 `--ring`, `hover:ring-[20px]` 제거, 장식 scale/rotate 제거, 진입 애니 ~150–250ms.

**vhd-08** · low · moderate · ~ · 제16조 — **공유 데이터 테이블이 밀집 정부 기록에 공간 과다(큰 행+높이 cap)** `standard-data-table.tsx:95,283,302-303`
- 영향: inner scrollbar 전 ~9–10행만 보여 수백 행 스캔에 과다 스크롤 — 밀도가 필요한 화면에서 throughput 희생.
- 개선: `density` prop(comfortable/compact) 추가, 데이터 밀집 테이블 기본 compact, `max-h-[700px]` cap opt-in.

---

## 5. 적대적 검증이 걸러낸 오탐 (3건 · 재조사·재수정 불필요)

각 발견은 "반증 시도" 에이전트가 실제 코드(및 DB)를 열어 재검증했다. 아래 3건은 근거가 실제와 어긋나 **기각**되었다.

**REFUTED · a11y-04** — *framer-motion이 reduced-motion 무시, CSS만 가드* → 핵심 근거('MotionConfig grep 0건')가 사실과 다름. `providers.tsx:77`에 `<MotionConfig reducedMotion="user">`가 전 앱 트리를 래핑하며, context가 portal을 통과해 모든 descendant motion 컴포넌트에 OS 선호를 전파. `globals.css`의 `@media` 가드는 순수 CSS용 보조. **JS 경로는 완전 커버 — 제9조 위반 없음.**

**REFUTED · nav-02** — *팔레트가 modernRoute 아닌 chkURL로 이동해 검색 dead-end* → 백엔드 `MenuService.calculateUrl`이 modernRoute를 먼저 반환하고 없을 때만 fallback → `chkURL == modernRoute`. NavItem의 `modernRoute||chkURL`과 동일 값. **팔레트 전용 dead-end 부재, 권고 수정은 기능적 no-op.**

**REFUTED · nav-09** — *헤더 route 맵에 고객지원센터(3000000) 누락 → 홈 오라우팅* → 로컬 DB(`tb_menu_info`) 조회 결과 top-level 도메인은 정확히 3개(1000000/2000000/9000000), 전부 유효 modernRoute 보유. `menu_sn=3000000` 조회는 0행 — **3000000 메뉴 자체가 부재.** DOMAIN_ICON_MAP의 3000000은 dead config일 뿐 라우팅 영향 0.

---

## 6. 감사 방법론

9개 UI/UX 관점을 병렬 팬아웃(디자인토큰·접근성·성능/로딩·반응형·컴포넌트 일관성·인터랙션 피드백·내비/IA·폼·시각위계) → 각 발견을 독립 에이전트가 적대적으로 재검증(CONFIRMED/PLAUSIBLE/REFUTED) → 종합. 근거는 모두 실제 파일·라인 인용 기반이며, 일부는 로컬 DB 브리지(`node .agent/scripts/db-bridge.js`)로 교차 확인했다. 총 73 에이전트, 3.6M tokens, 63개 원발견 중 60개 검증 통과·3개 기각.

> 본 리포트는 특정 시점(2026-07-10)의 진단이다. `file:line` 인용은 이후 커밋으로 변동될 수 있으므로, 착수 전 현재 코드를 재확인한다(오케스트레이션 프로토콜 §3.1). 코드 변경(L1↑) 착수 시 관련 헌법 조항을 직접 조회하고 `tsc --noEmit`·`next build` 게이트를 통과한다.
