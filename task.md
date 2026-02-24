# 🚀 Egov Enterprise Frontend Optimization Task

## 🛠 Progress Status (Ralph Loop)

### ✅ Ralph Loop #1: URL 매핑 테이블 구축 완료 (2026-02-24)
- [x] **Think (분석)**: 기존 테이블 직접 수정 방식이 효율적이라고 판단
- [x] **Plan (계획)**: NMENUINFO 에 modern_route 컬럼 추가 결정
- [x] **Implement (구현)**: 엔티티, 리포지토리, 마이그레이션 SQL 완료
- [x] **Test (검증)**: 단위 테스트 4 개 추가 (모두 통과)
- [x] **Summarize (요약)**: 아래 결과 보고

---

## 📋 세부 체크리스트

### Phase 0: JSP → React URL 매핑 인프라 구축 ✅
- [x] **Task 0.1**: Menu.java 엔티티에 `modernRoute`, `routeUpdatedAt` 필드 추가
- [x] **Task 0.2**: MenuRepository 에 조회/벌크 업데이트 메서드 5 개 추가
- [x] **Task 0.3**: 마이그레이션 SQL 작성 (50 개 메뉴 매핑)
  - 파일: `docs/migrations/001_add_modern_route_to_menu.sql`
  - 시스템/사용자/권한/로그/게시판/일정/기타 주요 메뉴 포함
- [x] **Task 0.4**: 단위 테스트 추가 (4 개)
  - `updateAndFindByModernRoute()`: 라우트 업데이트 및 조회
  - `findAllWithoutModernRoute()`: 미매핑 메뉴 조회
  - `bulkUpdateByPattern()`: 패턴 기반 일괄 업데이트
  - `countWithModernRoute()`: 매핑된 메뉴 수 카운트

### Phase 1: 기능 안정화 & 체계적 디버깅 (Systematic Debugging) ✅
- [x] **Task 1.1**: 로그인/인증 프로세스 전수 점검 및 안정화 완료.
- [x] **Task 1.2**: Global Providers 리팩토링 (Toast, Shortcut, Auth, WebSocket 통합) 완료.
- [x] **Task 1.3**: 백엔드 Ambiguous Mapping 및 Missing Service 로 인한 500 에러 해결 완료.

### Phase 2: 아키텍처 현대화 (Best Practices) 🏃‍♂️
- [x] **Task 2.1**: TanStack Query (React Query) 도입 및 Providers 설정 완료.
- [ ] **Task 2.2**: 게시글 목록 (`BbsApiController`) 페이지를 TanStack Query 로 전환.
- [ ] **Task 2.3**: 서비스 레이어 (`/services/*`) 데이터 매핑 구조 개선 진행 중.
- [x] **Task 2.4**: `useUser` 커스텀 훅 (React Query 기반) 생성 완료.

### Phase 1: 기능 안정화 (보완) 🏃‍♂️
- [ ] **Task 1.4**: 통합 대시보드 알림 (Notification) API 500 에러 원인 파악 및 수정.
- [ ] **Task 1.5**: 로그아웃 후 재로그인 시 토큰 갱신 이슈 재점검.

---

## 📊 Ralph Loop #1 결과 보고

### 🎯 문제 정의
JSP 에서 React 로 전환되면서 DB 에 저장된 메뉴 URL 이 레거시 `.do` 경로로 남아있어 링크 오류 발생

### 🏗 해결 방안
**하이브리드 방식 채택**: 별도의 매핑 테이블 생성 대신, 기존 `NMENUINFO` 테이블에 `modern_route` 컬럼 직접 추가

### 📁 생성된 아티팩트
| 파일 | 설명 |
|------|------|
| `common-domain/.../Menu.java` | `modernRoute`, `routeUpdatedAt` 필드 추가 |
| `common-domain/.../MenuRepository.java` | 조회/벌크업데이트 메서드 5 개 추가 |
| `docs/migrations/001_add_modern_route_to_menu.sql` | 스키마 변경 + 50 개 메뉴 매핑 SQL |
| `common-domain/.../MenuRepositoryTest.java` | 단위 테스트 4 개 추가 |

### 📋 매핑 규칙 (50 개 메뉴)
- `/sym/mnu/mpm/*` → `/admin/system/menus` (메뉴관리)
- `/uss/umt/*` → `/admin/user/manage` (사용자관리)
- `/sec/ram/*` → `/admin/security/authority` (권한관리)
- `/cop/bbs/*` → `/cop/bbs/selectBoardList` (게시판)
- `/cop/smt/*` → `/cop/smt/*` (일정관리)
- `/uss/ion/*` → `/uss/ion/*` (부가서비스)
- 기타: 로그/모니터링/통계/설문/약관/도움말

### ✅ 다음 루프 (Ralph Loop #2) 예정
1. **MenuService 에 `getModernRoute()` 메서드 추가**
2. **Controller 에서 modern_route 반환하도록 수정**
3. **Next.js 미들웨어에서 레거시 URL 감지 및 리다이렉트**

---

## 🤖 Subagent Dispatch Log
| Task ID | Subagent Role | Status | Result |
| :--- | :--- | :--- | :--- |
| T001 | URL Mapping | ✅ 완료 | 엔티티/Repository/SQL/테스트 완료 |
| T101 | Debugger | Idle | - |
| T201 | Architecture | Idle | - |
| T301 | Designer | Idle | - |
