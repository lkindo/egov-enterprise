# 20260425_community_collaboration_modernization.md

## 🎯 Objective
- `Community`, `Collaboration` 모듈의 UI/UX를 'Hub' 디자인 시스템으로 고도화.
- 레거시 `useEffect` 기반 데이터 패칭을 `TanStack Query`로 전환.
- `ApiService` 표준 패턴(자동 페이지 인덱스 매핑 등) 적용.

## 🛠️ Implementation Plan

### Phase 1: Community (COP) Modernization
- [x] `src/app/cop/cmy/selectCommunityList/page.tsx`를 `CommunityHubClient.tsx` 패턴으로 전환.
- [x] `getCommunityList` 호출 시 manual `pageIndex` 제거 및 `ApiService` 표준 활용.
- [x] `framer-motion` 기반의 프리미엄 애니메이션 및 `hub-glass-premium` 스타일 적용.
- [x] `src/app/cop/cmy/selectCommunityDetail/[id]/page.tsx`를 `CommunityDetailHubClient.tsx` 패턴으로 전환.

### Phase 2: Collaboration Modernization
- [ ] 협업 관련 페이지(게시판, 일정 등)의 일관성 체크.
- [ ] 공통 컴포넌트(`StandardDataTable`, `StatusBadge`) 적용 확대.

### Phase 3: Verification
- [ ] 빌드 테스트 수행.
- [ ] E2E 테스트(`playwright`)를 통한 기능 정합성 검증.

## 📝 Progress Log
- 2026-04-25: 태스크 생성. `CommunityListPage`의 레거시 패턴(useEffect, manual paging) 확인 및 고도화 계획 수립.
- 2026-04-25: Phase 1 (Community Modernization) 완료. 목록 및 상세 페이지를 Hub 디자인 시스템 및 TanStack Query 기반으로 전환 완료.
