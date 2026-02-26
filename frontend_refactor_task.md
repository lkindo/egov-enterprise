# Frontend Refactor Task List (Vercel React Best Practices)

## 진행 상황 기준
- [x] = 완료 (useQuery/useMutation 패턴 적용됨)
- [ ] = 미완료 (useEffect 레거시 패턴)

## 1. Infrastructure & Type Safety
- [x] [FRONT-01] Define API Response & Common Domain Types (src/types)
- [x] [FRONT-02] Replace `any` types with strict types in core components

## 2. Data Fetching Optimization (TanStack Query)
- [x] [FRONT-03] useMenuQuery, useUserQuery 커스텀 훅
- [x] [FRONT-04] Header.tsx, Sidebar.tsx useQuery 전환
- [x] [FRONT-05] API service layer 표준화 (src/services)

## 3. Authentication & Context
- [x] [FRONT-06] AuthContext.tsx 리팩토링 (50ms timeout 제거)
- [x] [FRONT-07] Axios interceptors 최적화

## 4. Admin System Pages (async-parallel, client-swr-dedup, rerender-*)
### 완료 (useQuery 패턴)
- [x] admin/system/common-code/groups/page.tsx
- [x] admin/system/common-code/codes/page.tsx
- [x] admin/system/common-code/details/page.tsx
- [x] admin/system/menus/by-authority/page.tsx
- [x] admin/system/sync-server/page.tsx
- [x] admin/system/audit/page.tsx
- [x] admin/system/backup/page.tsx
- [x] admin/system/batch/page.tsx
- [x] admin/system/programs/page.tsx
- [x] admin/system/server/page.tsx
- [x] admin/system/network/page.tsx
- [x] admin/system/trouble/page.tsx
- [x] admin/security/role/page.tsx
- [x] admin/security/group/page.tsx
- [x] admin/security/authority/page.tsx
- [x] admin/user/manage/page.tsx
- [x] admin/stats/user/page.tsx
- [x] admin/stats/screen/page.tsx
- [x] admin/help/faq/page.tsx
- [x] admin/help/qna/page.tsx
- [x] admin/terms/page.tsx
- [x] admin/survey/manage/page.tsx

### 미완료 (useEffect 레거시)
모든 주요 페이지 리팩토링 완료 (TanStack Query 전환 완료)

## 5. UI/UX & Performance
- [x] [FRONT-10] next/image 적용 (Header, BannerSlider)
- [x] [FRONT-11] inline styles → Tailwind CSS
- [x] [FRONT-12] 컴포넌트 디렉토리 구조 정리

---
*Last updated: 2026-02-26*
