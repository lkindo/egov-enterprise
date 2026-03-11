# 전사적 메뉴 통합 아키텍처 개편 설계 (Enterprise Integrated Menu Design)

## 1. 개요 (Overview)
본 설계 문서는 `Workspace` 및 `Operation` 모듈에 흩어져 있던 시스템/운영 관리자 기능들을 `module-system-admin`으로 완전 통합(옵션 A)하고, 이 과정에서 덜어내진 일반 사용자 기능들을 명확한 도메인(업무, 소통, 지원)에 따라 **전사적 통합 메뉴 구조**로 재편하는 아키텍처 변경안입니다.

## 2. 통합 메뉴 아키텍처 (Integrated Menu Architecture)

일반 사용자 권한과 시스템/콘텐츠 관리자 권한을 완벽히 분리하여 4개의 대분류로 재편합니다.

### 2.1. 🏢 Workspace (개인 업무 및 팀 협업)
순수한 개인 생산성과 커뮤니케이션 도구 중심으로 `module-workspace`를 구성합니다.
- **커뮤니케이션**: 쪽지 관리, 주소록 관리
- **일정 관리**: 일정관리, 간부일정관리
- **업무 보고**: 메모할일관리, 주간/월간보고관리

### 2.2. 💬 Community & Content (소통 및 정보 공유)
일반 사용자가 콘텐츠를 소비하고 소통하는 포털 성격의 공간입니다. (기반 모듈: `module-workspace`, `api-server` 등)
- **정보 채널**: 공지사항, 사내 뉴스 등 게시판 서비스
- **참여 공간**: 자유게시판, 부서별 커뮤니티
- *(메인 포털 화면의 팝업 및 배너 노출 영역)*

### 2.3. 🙋‍♂️ Service & Operation (참여 및 지원)
사용자가 사내 지원 시스템을 활용하거나 의견을 제출하는 창구입니다. (`module-operation` 담당)
- **설문 참여**: 진행 중인 설문조사 조회 및 응답
- **상담 및 지원**: 상담/문의 등록 및 내역 및 답변 조회

### 2.4. ⚙️ System Admin (시스템 및 서비스 통합 관리자)
시스템 설정, 권한 관리, 모든 콘텐츠/서비스 마스터 기준 정보를 통제하는 중앙 관리소입니다. (`module-system-admin` 완전 통합)
- **사용자 관리**: 일반/기업/업무 사용자 관리
- **보안/정책 관리**: 권한, 권한그룹, 롤, 로그인정책 관리
- **시스템 기준 정보**: 프로그램, 메뉴, 공통분류/상세 코드 관리
- **[신규 융합] 통합 콘텐츠 관리**: 게시판속성 관리, 커뮤니티 관리, 팝업창/배너 관리
- **[신규 융합] 고객 서비스 운영**: 설문 마스터 관리, 상담 마스터 관리 및 답변

---

## 3. 백엔드(Backend) 물리적 모듈 이동 가이드 및 의존성

다음 백엔드 구성 요소들을 `module-system-admin`으로 패키지 단위로 이전합니다. (Controller, Service, Repository, Entity, DTO 포함)

1. **From `module-workspace` -> `module-system-admin`**:
   - `BoardMaster` (게시판 속성 정의)
   - `CommunityMaster` (커뮤니티 속성 정의)
   - `Popup` (팝업 제어)
   - `Banner` (배너 제어)
   - *이동 위치 제안: `com.company.project.api.controller.system.content`*

2. **From `module-operation` -> `module-system-admin`**:
   - `SurveyMaster`, `SurveyQuestion` (설문지 폼 설계 및 통계 확인 로직)
   - `Consultation` (접수된 상담 확인 및 관리자 답변 로직)
   - *이동 위치 제안: `com.company.project.api.controller.system.service`*

> **[중요 주의사항]** 엔티티를 이동할 때 DB 테이블 제약조건이나 기존 시스템 간 양방향 매핑(ManyToOne 등)이 끊어지지 않는지(`api-server` 등을 통해) 의존성을 재검토해야 합니다.

## 4. 프론트엔드(Frontend) 및 DB 마이그레이션 전략

### 4.1. 관리자 라우팅 이동
- 이동된 도메인에 맞추어 관리자 페이지들의 라우팅 구조를 재편합니다.
- 예: 기존 `/admin/system/banner` 유지, `/admin/survey/manage` -> `/admin/service/survey` 등으로 일관성 있게 라우팅 폴더 구조 조정.
- **가장 시급한 이슈**: 현황 파악 시 누락되었던 **상담 관리(`5180000`, `/admin/help/qna`) 프론트엔드 화면을 신규 개발(또는 복원)하여 통합 관리자 페이지에 연결해야 합니다.**

### 4.2. 데이터베이스 재배치 스크립트
- 배포 시 `nmenuinfo` 테이블의 `upper_menu_no`를 대규모로 일괄 조정하는 SQL Script(`flyway` 등 마이그레이션 도구 권장)를 작성해야 합니다.
- 관리자 권한(`ROLE_ADMIN` 또는 각 세부 권한 그룹)이 이동된 메뉴 ID(메뉴번호)에 올바르게 매핑되도록 `nauthorinfo`, `nroleinfo` 권한 부여자 테이블 점검.

## 5. 실행 로드맵 (Execution Roadmap)

1. **[Phase 1] 백엔드 코드 마이그레이션 시도**: 엔티티, 서비스, 컨트롤러를 `module-system-admin`으로 물리적 이동 및 컴파일 (패키지 구조 재편성 포함).
2. **[Phase 2] 테스트 코드 정상화**: 빌드 성공 보장 및 유닛/통합 테스트 코드 수정.
3. **[Phase 3] 프론트엔드 경로 수정 및 화면 복원**: 경로에 맞춘 API 호출 `Axios` 경로 수정 및 누락된 상담 화면(Admin QnA) 기초 UI 작성.
4. **[Phase 4] 메뉴 구조 DB 스크립트 작성**: `nmenuinfo` 계층 구조를 업데이트하는 최종 SQL 스크립트 확보.
