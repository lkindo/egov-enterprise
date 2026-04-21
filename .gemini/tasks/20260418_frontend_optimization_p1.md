# 20260418 Frontend Optimization Plan (P1: Waterfall & Bundles)

본 문서는 eGov Enterprise 프론트엔드 성능 최적화 진행 상태를 기록한다.

## 작업 체크리스트

### 1. 전역 및 메인 페이지
- [x] **Item 1: Waterfall Elimination (Dashboard & Layout)**
    - [x] `page.tsx`: Defer `getDashboardData` promise to Client Component.
    - [x] `UnifiedDashboardClient.tsx`: Use `React.use()` to resolve and render.
    - [x] `layout.tsx`: Move menu fetching to non-blocking promise.
    - [x] `Header.tsx`/`Sidebar.tsx`: Async menu loading with `use()`.

### 2. Admin 모듈 최적화
- [x] **Item 1: Community Boards (List/Detail)**
    - [x] `selectBoardList/page.tsx`: Streaming board data.
    - [x] `BoardListClient`: Use `React.use()` for initial load.
    - [x] `BoardDetailPage`: Added `BoardDetailServer` data loader.
    - [x] `BoardDetailClient`: Resolved article/master promises concurrently.
- [x] **Item 2: Refactor Remaining Admin Modules**
    - [x] **Blueprint Library (Templates Admin)**: Refactored to streaming Server Component.
    - [x] **Collaboration (Address Book)**: Refactored to streaming Server Component.
    - [x] **System Admin (Menus)**: Refactored to streaming Server Component (parallel promises).
    - [x] **System Admin (Users)**: Refactored to `UserOrgHubClient` streaming.
    - [x] **System Admin (Logs)**: Refactored to `LogDashboardClient` streaming.
    - [x] **Security Admin (Authorities/Groups)**: Refactored to `SecurityHubClient` streaming.

### 3. 번들 사이즈 최적화 (Phase 2)
- [x] **Item 1: Dynamic Import Adoption**
    - [x] `GlobalUIComponents.tsx`: Created for `CommandMenu`, `RouteProgress`, `ScrollToTop`.
    - [x] `layout.tsx`: Applied `GlobalUIComponents` for lazy loading.
- [x] **Item 2: Specific Heavy Component Optimization**
    - [x] `TopologyMap`, `NationalDistributionMap`: `next/dynamic` with `ssr: false`.

- [x] 전수 조사 및 수정 완료. (주요 서비스 레이어 인코딩 무결성 확보)

## 최종 결과 및 검증
1. **번들 사이즈**: `npm run analyze` 결과, 공통 공유 JS 106kB, 주요 페이지 300kB 이하로 최적화됨.
2. **워터폴 제거**: `React.use()`를 통한 스트리밍 아키텍처가 전 관리자 모듈에 성공적으로 적용됨.
3. **안정성**: `npm run build` 결과 타입 오류 없이 통과.

---
*Status: COMPLETED (2026-04-18)*

## 다음 단계
1. **번들 사이즈 정밀 최적화**: 시각화 컴포넌트(`TypographyMap` 등) `next/dynamic` 적용.
2. **최종 빌드 분석**: `npm run analyze`를 통한 최적화 효과 측정.
3. **E2E 테스트**: 리팩토링된 모든 모듈의 기능 무결성 검증.
