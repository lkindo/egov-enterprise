# Task: 관리자 게시판 UX 안정화 및 E2E 테스트 무결성 확보 (2026-04-23)

## 1. 작업 개요
관리자 콘솔의 게시판 모듈에서 발생하는 E2E 테스트 실패 요인을 분석하고, 환경 설정 및 코드를 수정하여 전체 테스트 통과와 UX 정합성을 확보함.

## 2. 주요 수행 내용

### 2.1 환경 및 인프라 복구
- **서버 포트 정상화**: 3001번 포트에서 발생하던 정적 자산(MIME 타입) 로딩 오류를 프로세스 재시작을 통해 해결.
- **인증 세션 최적화**: `e2e/auth.setup.ts`에서 하드코딩된 3002 오리진을 `NEXT_PUBLIC_WEB_URL` 기반의 동적 오리진으로 변경하여 3001 포트에서도 LocalStorage 세션이 정상 작동하도록 수정.

### 2.2 코드 및 로직 개선
- **낙관적 업데이트 정합성**: `BoardListClient.tsx`의 `useMutation` 내 `onMutate`에서 사용하던 쿼리 키가 `useBoardList` 훅의 키 구조와 불일치하던 문제 수정.
- **테스트 가시성 보강**: 
    - 테이블 뷰(`TMPLT_LIST`)에 추천(좋아요) 버튼 추가 및 `data-testid="like-button"` 부여.
    - 정렬 셀렉트 박스에 `data-testid="board-sort-select"` 부여.
    - 검색 입력창에 `data-testid="board-search-input"` 부여.

### 2.3 E2E 테스트 검증 결과
`npx playwright test e2e/07-board-ux-optimization.spec.ts` 실행 결과:
- [x] **Search and Sort Persistence**: 검색어 및 정렬 조건이 URL과 동기화되어 페이지 이동 후에도 유지됨 확인.
- [x] **Optimistic Update - Like Action**: 추천 버튼 클릭 시 서버 응답 전 UI 숫자가 즉시 증가함 확인.
- [x] **Auto-save and Restoration**: 글쓰기 중 새로고침 시 로컬 스토리지 기반의 데이터 복구 팝업 및 복구 무결성 확인.

## 3. 향후 권장 작업
- **전역 명령 팔레트(Command Palette) 확장**: 현재 게시판에 국한된 `Cmd+K` 기능을 전 시스템 메뉴 및 데이터 검색으로 확장.
- **실시간 데이터 시각화**: `NationalDistributionMap`을 활용한 게시판 활동 지표 대시보드 완성.

---
**Status: COMPLETED (5/5 tests passed)**
