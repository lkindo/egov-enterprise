# 메뉴 및 도메인 통합 현황 보고서

## 1. 개요
본 보고서는 `docs/menu-connectivity-report.md`와 `docs/domain-menu-report.md`를 통합하고, 현재 데이터베이스 및 소스 코드 파일 시스템을 전수 조사하여 작성된 최종 현행화 문서입니다.

*   **보고서 생성 일시**: 2026-03-09
*   **확인 대상**: 
    - Database: Supabase Project `kmtcbkxvrbnfijvbdsrx`
    - Frontend: `frontend/src/app` 내 Next.js Page 라우팅
    - Backend: `module-*` 내 Spring Boot Controller 및 API
*   **삭제 문서**: `menu-connectivity-report.md`, `domain-menu-report.md` (동기화 후 삭제됨)

---

## 2. 통합 메뉴 현황표

| 대분류 | 중분류 | 메뉴번호 | 메뉴명 | 모듈 | Frontend (Modern Route) | Backend (API URL) | DB (Table) | 상태 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Workspace** | 게시판 관리 | 4010000 | 게시판속성관리 | Workspace | `/admin/community` (OK) | `/admin/collaboration` | `nbbsmaster` | 정상 |
| | | 4050000 | 커뮤니티관리 | Workspace | `/admin/community` (OK) | `/admin/community` | `ncmmnty` | 정상 |
| | 일정 관리 | 4080000 | 일정관리 | Workspace | `/smart-toolkit/schedule` (OK) | `/admin/collaboration` | `nschdulinfo` | 정상 |
| | | 4160000 | 간부일정관리 | Workspace | `/smart-toolkit/schedule` (OK) | `/admin/collaboration` | `n leaderschdul` | 정상 |
| | 커뮤니케이션 | 4150000 | 주소록관리 | Workspace | `/cop/adb/selectAddressBookList` (OK) | `/admin/collaboration` | `nadbk` | 정상 |
| | | 5490000 | 쪽지관리 | Workspace | `/note` (OK) | `/note` | `nnote` | 정상 |
| | 업무 보고 | 4190000 | 주간/월간보고관리 | Workspace | `/smart-toolkit/work-report` (OK) | `/cop/smt/wmr/selectReportList` | `nwikmnthngreprt` | 정상 |
| | | 4200000 | 메모할일관리 | Workspace | `/smart-toolkit/work-report` (OK) | `/cop/smt/mtm/selectTodoList` | `nmemotodo` | 정상 |
| **Operation** | 사용자 관리 | 5010000 | 기업회원관리 | System Admin | `/admin/user/manage` (OK) | `/admin/user/manage` | `nemplyrinfo` | 정상 |
| | | 5020000 | 업무사용자관리 | System Admin | `/admin/user/manage` (OK) | `/admin/user/manage` | `nemplyrinfo` | 정상 |
| | | 5040000 | 일반회원관리 | System Admin | `/admin/user/manage` (OK) | `/admin/user/manage` | `nemplyrinfo` | 정상 |
| | 설문조사 | 5200000 | 설문관리 | Operation | `/admin/survey/manage` (OK) | `/admin/survey/manage` | `nqestnrinfo` | 정상 |
| | | 5210000 | 설문조사 | Operation | `/survey/response` (OK) | `/admin/survey/manage` | `nqustnrrespondinfo` | 정상 |
| | 콘텐츠 관리 | 5340000 | 팝업창관리 | Workspace | `/admin/system/banner` (OK) | `/api/v1/popups` | `npopupmanage` | 정상 |
| | | 5360000 | 배너관리 | Workspace | `/admin/system/banner` (OK) | `/api/v1/banners` | `nbanner` | 정상 |
| | **상담 지원** | 5180000 | 상담관리 | Operation | `/admin/help/qna` (**Miss**) | `/api/v1/consultations` | `ncnsltinfo` | **Frontend 미구현** |
| **Security** | 보안 정책 | 1020000 | 로그인정책관리 | System Admin | `/admin/user/login-policy` (OK) | `/admin/user/manage` | `nloginpolicy` | 정상 |
| | 권한 관리 | 2010000 | 권한관리 | System Admin | `/admin/security/authority` (OK) | `/admin/security/authority` | `nauthorinfo` | 정상 |
| | | 2020000 | 권한그룹관리 | System Admin | `/admin/security/authority` (OK) | `/admin/security/group` | `nauthorgroupinfo` | 정상 |
| | | 2040000 | 롤관리 | System Admin | `/admin/security/role` (OK) | `/admin/security/role` | `nroleinfo` | 정상 |
| **Admin** | 기준 정보 | 6010000 | 공통분류코드 | System Admin | `/admin/system/common-code` (OK) | `/admin/system/common-code` | `ccmmnclcode` | 정상 |
| | | 6020000 | 공통상세코드 | System Admin | `/admin/system/common-code` (OK) | `/admin/system/common-code` | `ccmmndetailcode` | 정상 |
| | 메뉴 관리 | 6130000 | 메뉴리스트관리 | System Admin | `/admin/system/menus` (OK) | `/admin/system/menus` | `nmenuinfo` | 정상 |
| | 프로그램 관리| 6180000 | 프로그램리스트관리 | System Admin | `/admin/system/programs` (OK) | `/admin/system/programs` | `nprogrmlist` | 정상 |

---

## 3. 특정 도메인 정리 및 원복 일치 결과

현시점 파일 및 DB 확인 결과를 기반으로 아래 요청 사안들의 현황을 확인하였습니다.

1.  **Holiday (휴일) / Anniversary (기념일)**: 
    - 관련 DB 테이블 및 Java Entity 삭제 확인.
    - Frontend 내 관련 코드 제거 확인.
2.  **Commute (근태)**: 
    - 관련 DB 테이블 및 Java Controller 삭제 확인.
    - 메뉴 2400 (임직원 복지 및 근태 관리)의 껍데기만 잔존하며, 하위 메뉴는 모두 소멸됨.
3.  **TermsInfo (약관)**: 
    - 관련 내용 삭제 확인.
4.  **Counsel (상담)**: 
    - **원복 진행됨.**
    - Backend: `CnsltController`, `CnsltService`, `CnsltManage` 엔티티 복구 확인.
    - API: `/api/v1/consultations` 가동 중.
    - **이슈**: Frontend 화면(`/admin/help/qna`)은 현재 물리적 파일이 누락되어 있어 추가 복구가 필요함.

---

## 4. 최종 확인 및 발견된 이슈 (Critical)

*   **[Critical] 상담(Counsel) Frontend 누락**: 상담 도메인은 백엔드 원복이 완료되었으나, 메뉴에 매핑된 `/admin/help/qna` 화면 파일이 실제 파일 시스템에 존재하지 않음.
*   **[Info] 메뉴 데이터 잔재**: `2400` 번 근태 관리 루트 메뉴가 DB에 남아있음. 시스템 메뉴 관리에서 실제 삭제를 권장함.
*   **[Improvement] 경로 중복**: `admin/user/manage` 화면이 일반회원, 기업회원, 업무사용자 관리에 모두 동일하게 매핑되어 있음. 권한별 필터링이 기능하고 있는지 검증 필요.

---
**검증자**: Antigravity Assistant
**보고서 위치**: `d:\project\egov-enterprise\docs\integrated-menu-report.md`
