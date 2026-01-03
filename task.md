# 작업 체크리스트

## 테스트 계정 정보 (Test Credentials)
> **Common Password**: `rhdxhd12` (Hash: `raHL...`)
- **Admin**: `webmaster`
- **User**: `USER`
- **Enterprise**: `ENTERPRISE`
- **Test**: `TEST1`


- [x] PRD.MD 작성
- [x] 프로젝트 구조 분석 (기존 AS-IS vs 목표 TO-BE)
- [x] TRD.MD 작성
- [x] LLD.MD 작성
- [x] 멀티 모듈 프로젝트 구조 초기화
    - [x] 루트 프로젝트 생성 (Gradle)
    - [x] common-core 모듈 생성
    - [x] common-domain 모듈 생성
    - [x] common-security 모듈 생성
    - [x] Fix menu link logic and depth in JSP
    - [x] Create `Program` entity and repository for URL mapping
    - [x] Update `MenuService` for dynamic URL-based identification
    - [x] Update `GlobalMenuAdvice` for session syncing and dynamic root identification
    - [x] Resolve "내부시스템관리" menu disappearance by disabling redundant controller logic
    - [x] Fix submenu expansion issue across all root menus
    - [x] common-service 모듈 생성
    - [x] api-server 모듈 생성
- [x] 핵심 기술 마이그레이션
    - [x] JPA 및 QueryDSL 설정
    - [x] JWT 보안 설정
- [x] 전자정부프레임워크(eGovFrame) 5.0 표준 준수 업그레이드
    - [x] RTE 5.0.0 의존성 추가 (cmmn, dataaccess, property, logging, idgnr, crypto)
    - [x] ARIA 암호화 구현 (CryptoUtil)
    - [x] 서비스 상속 구조 리팩토링 (EgovAbstractServiceImpl)
- [/] 기능 포팅 (Porting)
    - [x] 사용자(User) 모듈 (Entity, Repos, Service, Controller)
    - [x] 공통 코드(Common Code) 모듈 (Entity, Repos, Service, Controller)
    - [/] 게시판(BBS) 모듈 (Entity, Repos, Service, Controller) - *인코딩 수정 중*
    - [/] 파일 관리(File) 모듈 (Entity, Repos, Service, Controller) - *구현 확인 중*
- [x] 문서화 및 검증
    - [x] WALKTHROUGH.md 작성
    - [x] 표준 준수 분석 보고서 작성
- [x] 배포 설정
    - [x] Dockerfile 생성 (Multi-stage)
    - [x] docker-compose.yml 생성
    - [x] Postgres DB Docker 연결 설정
    - [x] postgres DB DDL/DML Script에서 테이블명 COMT 접두어 제거 (기존 파일 백업 후작업)
- [x] Document Menu-Table Relationships `[Doc]` <!-- id: 5 -->
- [x] Enhance User Module Validation `[Refactor]` <!-- id: 7 -->
- [x] RESOLVE_ENTERPRISE_DEPENDENCIES `[Build]` <!-- id: 6 -->
- [/] Hybrid Migration (Backend First)
    - [x] MIGRATION_STRATEGY.md 작성
    - [x] 관리자 공통 메뉴 (Admin Menu) 이관
        - [x] MenuService 검증 (Tree Structure)
        - [x] EgovMainController에 MenuService 주입
        - [x] JSP 호환 Adapter 구현 (MenuDto -> Map)
        - [x] 메뉴 렌더링 검증 (컴파일 완료)
    - [x] 메인 페이지 (Main Page) 이관
        - [x] BoardService 기능 추가 (최신글 조회)
        - [x] EgovMainController에 BoardService 주입
        - [x] JSP 호환 Adapter 구현 (BoardDto -> Map)
        - [x] 메인화면 게시글 노출 검증 (컴파일 완료)
    - [x] 로그인/인증 (Login/Auth) 이관
        - [x] AuthService 기능 확장 (Legacy Session 호환)
        - [x] EgovLoginController -> AuthService 전환
        - [x] Spring Security <-> EgovUserDetailsHelper 동기화 검증 (컴파일 완료)
    - [x] 게시판 (BBS) 전체 이관
        - [x] EgovBBSManageController 분석 및 대체 계획
        - [x] 게시글 목록(List) 조회 Adapter 구현 (Service 교체 완료)
        - [x] 게시글 상세(Detail) 조회 Adapter 구현 (Service 교체 완료)
        - [x] 게시글 등록/수정(Write/Update) Adapter 구현
        - [x] 게시글 삭제(Delete) 기능 검증
        - [x] Integrate `patch_DDL.sql` and `patch_DML.sql`
        - [x] Remove `COMT`/`LETT` prefixes from SQL Mappers (Aligned with `table_list.txt`)
    - [x] **Enterprise Standardization (Refactoring)**
        - [x] Enforce PostgreSQL (Docs & Config)
        - [x] Remove `egovframework.let` (Light) packages
        - [x] Import `egovframework.com` (Enterprise) packages
        - [x] Migrate Controllers (`QustnrRespondInfo`, `BbsUserStats`, `ConnectStats`) to `com`

## 🚀 메뉴 마이그레이션 로드맵 (1~4순위)
> 이 섹션은 다른 개발자와 협업하거나 다른 환경에서 작업을 이어갈 때 진행 상황을 추적하기 위해 사용합니다.

### [Phase 1] 1순위: 시스템관리 - 메뉴/프로그램 관리 (Core Foundation)
- [x] 프로젝트 공유 및 이식성 설정 (체크리스트 루트 이관, 초기화 경로 상대화)
- [x] 프로그램 관리 (`NPROGRMLIST`) JPA 전환 (Repository, ServiceImpl)
- [x] 메뉴 관리 (`NMENUINFO`) JPA 전환 (Repository, ServiceImpl)
    - [x] Excel 일괄 등록 및 하위 메뉴 조회 로직 JPA 연동
    - [x] Java VO <-> JPA Entity 매핑 및 데이터 정합성 확보
    - [x] 기존 JSP View와 JPA Service 간 어댑터 적용 (VO 기반 데이터 전달)
- [x] 메뉴 생성 관리 (`NMENUCREATDTLS`) 권한 매핑 검증 및 JPA 전환 완료
    - [x] 기존 MyBatis SQL 및 로직 분석 완료
    - [x] JPA Entity (`MenuAuthority`, `UserAuthority`) 및 Repository 분석 완료
    - [x] `EgovMenuCreateManageServiceImpl` JPA 전환 및 레거시 제거 완료
- [x] **사용자 확인 요청**: 1순위 시스템관리 기본 기능 작동 여부 완료

### [Phase 2] 2순위: 보안관리 - 권한/롤 관리 (Security)
- [x] 권한 관리 (`NAUTHORINFO`) JPA 전환 및 메뉴 연결 완료
- [x] 롤 관리 (`NROLEINFO`) JPA 전환 및 메뉴 연결 완료 (AuthorRole 포함)
- [x] 권한별 메뉴 접근 제어 (Spring Security 연동) 검증 완료 (JPA 기반 권한 할당 구현)
- [x] **사용자 확인 요청**: 2순위 보안 설정 및 권한별 접근 제한 작동 여부 완료

### [Phase 3] 3순위: 시스템관리 - 공통코드 관리 (Data Standards)
- [x] 공통분류코드 (`NCMMNCLCODE`) JPA 전환 및 DAO 제거
- [x] 공통코드 (`NCMMNCODE`) JPA 전환 및 DAO 제거
- [x] 공통상세코드 (`NCMMNDETAILCODE`) JPA 전환 및 DAO 제거
- [ ] **사용자 확인 요청**: 3순위 공통코드 체계 및 업무 데이터 연동 여부

### [Phase 4] 4순위: 사용자지원 - 업무사용자관리 (User Domain)
- [x] 업무사용자/일반회원/기업회원 Entity, Repository 구현 및 Service JPA 전환
- [x] 사용자-권한 매핑 로직 점검 (JPA 기반 연동 완료)
- [x] 로그인 후 사용자 정보 세션/컨텍스트 동기화 최종 확인 (AuthenticationProvider 개선 완료)
- [x] MyBatis DAO 및 SQL Mapper 파일 제거
- [ ] **사용자 확인 요청**: 4순위 사용자 관리 및 전체 시스템 통합 연동 여부

