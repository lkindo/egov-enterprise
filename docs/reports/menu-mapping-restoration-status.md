# 🛠️ 메뉴-프로그램 연결 유실 조사 및 복구 가이드 (2026-03-18)

본 문서는 Next.js 15 프론트엔드와 Spring Boot 백엔드 통합 과정에서 발생한 **메뉴-기능 연결 유실(404 에러 및 동작 불능)** 문제에 대한 조사 내용과 향후 복구 전략을 정리한 문서입니다.

---

## 1. 개요 (Executive Summary)

*   **배경**: 전자정부프레임워크 5.0 기반의 레거시 메뉴 체계를 Next.js 15+ 기반의 모던 관리자 화면으로 전환 중.
*   **문제**: 백엔드 `NMENUINFO` 테이블의 메뉴 중 `MODERN_ROUTE`가 비어 있거나 레거시(`.do`) 경로로 설정되어 있어, 프론트엔드 클릭 시 기능이 작동하지 않음.
*   **현재 상태**: Supabase DB와 프론트엔드 파일 시스템을 전수 조사하여 **87개의 유효 라우트**와 **350개의 메뉴** 간 불일치 지점을 식별함.

---

## 2. 조사 및 조치 내용 (Investigation & Actions)

### 2.1. 데이터베이스 현황 (Supabase)
*   **Project ID**: `kmtcbkxvrbnfijvbdsrx` (egov-enterprise)
*   **조사 결과**:
    *   `nmenuinfo` (350개 레코드): 대다수 메뉴가 `modern_route`가 누락되거나 `#`으로 방치됨.
    *   `nprogrmlist` (전수 조사 완료): 프로그램 테이블의 `url` 또한 레거시 JSP 경로(`.do`)로 유지되어 Next.js와 매칭 불가.

### 2.2. 프론트엔드 라우트 분석
*   **조사 경로**: `frontend/src/app`
*   **식별된 유효 경로 (87개)**:
    *   `/admin/system/common-code` (공통 코드 관리)
    *   `/admin/system/files` (파일 통합 관리)
    *   `/admin/community/boards` (게시판 관리)
    *   `/admin/collaboration/address-book` (주소록 관리)
    *   `/admin/survey/manage` (설문조사 관리) 등

### 2.3. 기수행 조치
*   **1차 패치**: `게시판 마스터 관리(1100)`, `파일 관리`, `코드 관리` 도메인에 대해 누락된 `modern_route`를 Supabase SQL로 수동 업데이트 시도.

---

## 3. 핵심 유실 원인 (Root Causes)

1.  **경로 불일치**: 백엔드는 `/admin/uss/olh` 등의 레거시 명명 규칙을 따르고 있으나, 프론트엔드는 `/admin/help/...` 식으로 재편됨.
2.  **하위 메뉴 고립**: 대메뉴만 라우트가 잡혀 있고, 하위 메뉴(등록/상세/삭제 등)는 여전히 레거시 프로그램을 참조함.
3.  **프론트엔드 미구현 도메인**: `온라인 매뉴얼`, `용어 사전` 등 백엔드 메뉴에는 존재하지만 프론트엔드에 `page.tsx`가 없는 도메인이 전사 도메인의 30%를 차지함.

---

## 4. 향후 복구 가이드 (Future Recovery Guide)

### 단계 1: 데이터 무결성 복구 (Short-term)
다음 SQL 구문을 통해 실재하는 프론트엔드 페이지와 메뉴를 강제로 재결합해야 합니다.

```sql
-- 1. 유실된 대단위 메뉴 현대적 라우트 주입
UPDATE nmenuinfo SET modern_route = '/admin/community/boards' WHERE menu_nm LIKE '%게시판%' AND modern_route IS NULL;
UPDATE nmenuinfo SET modern_route = '/admin/system/codes' WHERE menu_nm LIKE '%코드%' AND modern_route IS NULL;

-- 2. 명명 규칙 불일치 교정
UPDATE nmenuinfo SET modern_route = '/admin/help/qna' WHERE modern_route = '/admin/uss/olh/qna';
```

### 단계 2: 연동 서비스 강화 (Mid-term)
*   `MenuService.java`에서 `modernRoute`가 없을 경우, `progrm_file_nm`의 앞글자를 따서 **Next.js의 신규 경로를 추론**하는 폴백 로직(Fallback Logic) 구현.
    *   예: `EgovBoardManage` -> `/admin/community/boards`

### 단계 3: 프론트엔드 페이지 생성 (Long-term)
*   `frontend/src/app/admin/uss/...` 하위에 누락된 도메인들의 `page.tsx`를 생성하거나, 백엔드 메뉴 DB에서 사용하지 않는 메뉴를 비활성화(`is_use = 'N'`) 처리.

---

## 5. 참고 리소스 (References)
*   **백엔드 엔티티**: `com.company.project.domain.menu.Menu.java`
*   **메뉴 초기화**: `MenuDataInitializer.java`
*   **데이터 패치**: `api-server/src/main/resources/patch_bbs_use_url.sql` (게시판 보정 예시)

---
**주의**: 추가 작업 시작 시 Supabase MCP로 다시 프로젝트 `kmtcbkxvrbnfijvbdsrx`에 연결한 후 `nmenuinfo`의 실제 `modern_route` 컬럼을 반드시 재확인하십시오.
