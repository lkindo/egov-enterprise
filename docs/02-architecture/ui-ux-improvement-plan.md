# UI/UX 및 디자인 시스템 개선 로드맵 (UI/UX Improvement Plan)

## 1. 개요 (Overview)
본 문서는 eGov Enterprise 프로젝트의 기존 UI/UX 한계를 진단하고, **"Unified Premium"** 디자인 철학 및 최신 기술 스택(Next.js 15, Tailwind CSS v4, Framer Motion)을 활용하여 시스템 전반의 사용성과 시각적 완성도를 극대화하기 위한 단계별 개선 계획입니다.

## 2. 현황 진단 및 해결 방안 (Pain Points & Solutions)

| 진단 영역 | 현재 문제점 | 개선 방안 (Solutions) |
| :--- | :--- | :--- |
| **디자인 토큰 (Token)** | `rounded-xl`, 컬러 등 하드코딩된 Tailwind 클래스 산재. | **Tailwind CSS v4**의 `@theme` 지시어를 활용해 순수 CSS 변수 기반으로 토큰화. 하드코딩 제거. |
| **비동기 UI (Loading)** | 데이터 로딩 시 빈 화면 노출 또는 렌더링 멈춤 현상 발생. | **Suspense & Skeleton UI** 전면 도입. 무거운 위젯(`TopologyMap` 등)은 `next/dynamic` + 점진적 로딩(Progressive UX) 적용. |
| **인터랙션 (Animation)** | 정적인 화면 및 클릭/포커스 시 피드백 부족. | **Framer Motion** 기반 마이크로 애니메이션(Spring 바운스, 페이지 전환, 리스트 Stagger) 적용하여 'WOW' 프리미엄 경험 제공. |
| **입력폼 UX (Forms)** | 에러 메시지가 폼 하단이 아닌 페이지 상단에 위치하거나 검증 피드백이 느림. | `useAppForm` (React Hook Form + Zod) 연동을 통한 **실시간 인라인(Inline) 피드백** 및 에러 필드 애니메이션 제공. |
| **접근성 및 테마 (A11y)**| 다크모드 시 명도 대비(WCAG AA) 미달 구간 존재. 모바일 모달 오버플로우. | 다크모드 배경색(`dark-gray-900`) 조정. ARIA 라벨 강제화 및 모바일 모달 레이아웃(`overflow-y-auto`) 최적화. |
| **데이터 그리드 (Data Grid)** | 대량 데이터 목록에서 헤더 고정, 컬럼 조절, 일괄 작업 등 엔터프라이즈급 조작 기능 부재. | **Sticky Header**, **Resizable Columns**, 다중 선택 시 **플로팅 벌크 액션 바(Floating Bulk Action Bar)** 도입. |
| **알림 시스템 (Notifications)** | 저장/오류 시 `alert` 또는 모달로 작업 흐름이 끊기는 차단형(Blocking) UX. | `Sonner` 등을 활용한 **비차단형 스택 토스트(Non-blocking Toast)** 도입. 로딩→완료 전환 애니메이션 포함. |
| **키보드 생산성 (Keyboard)** | 마우스 클릭 위주의 인터페이스로 파워 유저의 작업 속도 저하. | `Cmd/Ctrl+K` **커맨드 팔레트(Command Palette)**, `Esc` 모달 닫기, `Cmd/Ctrl+Enter` 즉시 저장 등 단축키 바인딩. |

---

## 3. 단계별 실행 로드맵 (Phased Roadmap)

### Phase 0: 디자인 토큰 및 기반 설정 (Design Foundation)
- [ ] `app/globals.css` 내 Tailwind v4 `@theme` 지시어를 이용한 글로벌 CSS 변수(`--radius`, `--color-primary` 등) 전면 정의.
- [ ] 다크 모드(Dark Mode) 전용 명도 대비 최적화 컬러 팔레트 재설정.
- [ ] 디자인 토큰(`design.md`) 문서 최신화.

### Phase 1: 일관성 리팩토링 (Consistency Refactoring)
- [ ] `Board`, `User` 등 주요 화면에 산재한 하드코딩 클래스(`rounded-xl`, `gap-4` 등)를 디자인 토큰(`rounded-base`, `gap-base`)으로 일괄 치환.
- [ ] 버튼 컴포넌트(`button-primary`), 벤토 위젯(Card) 디자인 시스템 일원화.

### Phase 2: 비동기 UI & 폼 경험 개선 (Async UI & Smart Forms)
- [ ] 데이터 페칭이 일어나는 모든 영역에 TanStack Query 연동 **Skeleton UI 및 Suspense 바운더리** 구현.
- [ ] 폼 컴포넌트를 `useAppForm` 기반으로 재작성하여 **실시간 인라인 에러 렌더링** 적용.
- [ ] `TopologyMap` 등 대형 시각화 컴포넌트의 지연 로딩(Lazy Loading) 및 로딩 인디케이터 고도화.

### Phase 3: 프리미엄 인터랙션 도입 (Premium Micro-interactions)
- [ ] **Framer Motion** 도입: 
  - 페이지 라우팅 시 부드러운 전환(Page Transitions) 효과.
  - 대시보드 진입 시 벤토 위젯들이 순차적으로 나타나는 스태거(Stagger) 애니메이션.
  - 모달 팝업 오픈 및 주요 버튼 클릭 시 물리 기반 바운스(Spring) 효과 추가.
- [ ] Hover, Focus 시 프리미엄 글로우(`premium-glow`) 효과 등 시각적 피드백 강화.

### Phase 4: 엔터프라이즈 생산성 UX (Enterprise Productivity)
- [ ] **데이터 그리드 고도화**: 목록 화면에 Sticky Header, 컬럼 Resize, 플로팅 벌크 액션 바 구현.
- [ ] **글로벌 토스트 알림 시스템**: `Sonner` 도입 및 로딩→성공/실패 전환 애니메이션 적용. 기존 `alert`/모달 기반 알림 교체.
- [ ] **커맨드 팔레트 & 단축키**: `Cmd/Ctrl+K` 글로벌 검색, `Esc` 모달 닫기, `Cmd/Ctrl+Enter` 폼 저장 등 키보드 내비게이션 체계 구축.

### Phase 5: 반응형 안정화 및 접근성 (Responsive & A11y)
- [ ] 모바일 기기에서의 모달/팝업 스크롤 문제 해결 (Mobile-first Viewport 제어).
- [ ] 모든 인터랙티브 DOM 요소(`button`, `a`, 아이콘)에 `aria-label` 및 키보드 접근성(Tab Navigation) 보장.

### Phase 6: 성능 최적화 및 최종 검증 (Performance & QA)
- [ ] 고비용 시각 효과(`backdrop-blur`)에 대한 저사양 기기 fallback 처리 (`@media (prefers-reduced-motion)` 적용).
- [ ] Next.js 번들 사이즈 분석(`npm run analyze`) 및 Lighthouse 성능/접근성 지표 측정.
- [ ] Playwright E2E 테스트를 통한 UI/UX 레이아웃 회귀 테스트.

---

## 4. 도메인별 상세 개선 전략 (Detailed Domain Strategies)

### 📊 4.1 Admin Hub & Dashboard (대시보드)
- **대상**: `UnifiedDashboardClient.tsx`, `work-hub`
- **전략**:
    - **Streaming SSR**: Next.js 15의 스트리밍 렌더링을 활용해 지표 위젯을 점진적으로 노출하여 체감 로딩 속도 향상.
    - **Bento 애니메이션**: 대시보드 진입 시 각 위젯에 `Framer Motion` Stagger 효과를 적용하여 프리미엄 대시보드 느낌 강화.

### 👤 4.2 Identity & User Management (사용자/조직 관리)
- **대상**: `admin/user` (사용자, 부서, 권한 정책)
- **전략**:
    - **Bulk Action Bar**: 사용자 다중 선택 시 하단에 플로팅 바를 노출하여 일괄 권한 변경 및 상태 관리 최적화.
    - **Zod 기반 실시간 검증**: `useAppForm`을 활용하여 데이터 저장 전 타이핑 단계에서 즉각적인 유효성 피드백 제공.

### ⚖️ 4.3 Approval & Workflow (전자결재)
- **대상**: `approvals`, `workflow`, `sanctn`
- **전략**:
    - **Visual Stepper**: `ApprovalStepper` 컴포넌트에 레이아웃 애니메이션을 적용하여 결재 프로세스의 흐름을 시각적으로 명확화.
    - **Quick Decision UX**: 리스트 뷰에서 토스트 알림 내 버튼을 통해 상세 진입 없이 결재 승인/반려 처리 기능 구현.

### 📢 4.4 Community & COP (게시물/커뮤니티)
- **대상**: `cop/cmy`, `admin/community`
- **전략**:
    - **Advanced Grid**: Sticky Header와 Resizable Column을 게시물 목록에 기본 적용.
    - **D&D Uploader**: 드래그 앤 드롭 파일 업로드와 `Sonner` 기반의 업로드 진행률 실시간 트래킹.

### ⚙️ 4.5 System & Security Admin (시스템 설정)
- **대상**: `admin/system`, `admin/security`
- **전략**:
    - **Command Palette**: `Cmd+K` 단축키를 통한 메뉴 및 공통코드 즉시 검색 및 이동 기능.
    - **Hierarchy Tree D&D**: 메뉴 구성 및 계층형 코드 관리 시 드래그 앤 드롭으로 구조 변경이 가능하도록 고도화.

---
*Generated & Optimized by: Antigravity Agent*
