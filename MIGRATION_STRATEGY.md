# 하이브리드 마이그레이션 전략: 선(先) 백엔드, 후(後) 프론트엔드

> **작성일**: 2025-12-28
> **목표**: 기존 JSP UI를 유지하면서 백엔드 로직을 Spring Boot 3 핵심 기술(JPA/QueryDSL)로 현대화하는 "백엔드 우선" 전환 전략을 수립합니다.

---

## 1. 전략 개요 (Hybrid Approach)

"빅뱅(Big Bang)" 방식의 전면 교체 리스크를 최소화하기 위해, **프론트엔드(JSP)는 일단 유지하되 백엔드(Service/Repository)를 우선적으로 교체**하는 하이브리드 방식을 채택합니다.

### 1.1 아키텍처 변화 (Architecture Change)
- **AS-IS (현재)**: `Controller` → `Service(Legacy)` → `DAO(MyBatis/Map)` → `DB`
- **TO-BE (과도기)**: `Controller` → **`Service(Modern JPA)`** → `Adapter` → `JSP`
- **TO-BE (최종)**: `Controller(REST)` → `Service(Modern JPA)` → `React/Next.js`

### 1.2 핵심 원칙 (Core Principles)
1. **사용자 경험 유지**: 마이그레이션 중에도 기존 JSP 화면의 기능과 UI는 동일하게 유지되어야 한다.
2. **데이터 중심 모델링**: DB 스키마와 JPA 엔티티(Entity) 정의를 최우선으로 정립한다.
3. **점진적 서비스 교체**: 메인 페이지와 공통 관리자 메뉴부터 시작하여 업무 단위로 서비스를 순차 교체한다.
4. **패키지 표준화**: 기존 `egovframework.let` 패키지 의존성을 전자정부 5.0 표준인 `egovframework.com`으로 일괄 전환한다.

---

## 2. 상세 마이그레이션 계획 (Migration Phase)

### 1단계: 관리자 공통 메뉴 (Admin Common Menu)

사이트의 핵심 네비게이션(헤더, 좌측 메뉴)을 담당하는 로직을 신규 `MenuService`로 교체합니다.

#### 현재 상태 분석 (Analysis)
- **컨트롤러**: `EgovMainController`
- **뷰 (JSP)**: `EgovIncHeader.jsp`, `EgovIncLeftmenu.jsp`
- **레거시 서비스**: `egovframework.com.sym.mnu.mpm.service.EgovMenuManageService`
- **데이터 요구사항**:
  - `list_headmenu` (상단 메뉴 리스트)
  - 항목 구조: `menuNo`, `menuNm`, `chkURL`, `children` (계층형 트리 구조)

#### 작업 계획 (Action Plan)
1. **신규 서비스 검증**: `common-service` 모듈의 `MenuService.getMenuHierarchy()`가 트리를 올바르게 반환하는지 확인.
2. **컨트롤러 수정**:
   - `EgovMainController`에 신규 `MenuService` 주입.
   - 기존 `meunManageService` 호출 코드를 신규 서비스로 대체.
3. **데이터 어댑터(Adapter) 구현**:
   - `MenuDto`(신규)를 레거시 `Map/VO` 형식으로 변환하는 로직 구현.
   - JSP가 기대하는 계층 구조(`children` 필드 등)를 완벽히 재현하여 Model에 전달.
4. **최종 검증**: GNB 메뉴 클릭 시 이동 여부 및 하위 메뉴 펼침 동작 정상 확인.

---

### 2단계: 메인 페이지 (Main Page)

메인 페이지를 구성하는 동적 콘텐츠(공지사항, 자료실 최신글)를 신규 `BoardService`로 교체합니다.

#### 현재 상태 분석 (Analysis)
- **컨트롤러**: `EgovMainController`
- **뷰 (JSP)**: `EgovMainView.jsp`
- **레거시 서비스**: `egovframework.com.cop.bbs.service.EgovBBSManageService`
- **데이터 요구사항**:
  - `notiList` (공지사항), `bbsList` (최신 게시글)
  - 필수 필드: `nttSj` (제목), `frstRegisterPnttmStr` (날짜), `ntcrNm` (작성자)

#### 작업 계획 (Action Plan)
1. **신규 서비스 기능 확장**:
   - `BoardService`에 "특정 게시판 최신글 N개 조회" API 구현 (`findLatestArticles`).
2. **컨트롤러 수정**:
   - `EgovMainController`에 `BoardService` 주입 및 연결.
   - 공지사항(`BBSMSTR_AAAAAAAAAAAA`) 및 자료실 데이터 연동.
3. **데이터 어댑터 구현**:
   - `ArticleDto` → `Map` 변환 어댑터 작성.
   - JSP용 날짜 포맷(`yyyy-MM-dd`) 및 문자열 처리(`frstRegisterPnttmStr`).
4. **최종 검증**: 메인 페이지 로딩 시 DB 데이터가 정상 출력되는지 확인.

---

### 3단계: 전사 확산 및 현대화 (Gradual Rollout)

위의 검증된 패턴을 기반으로 전체 업무 모듈을 순차 전환합니다.

1. **인증/인가**: `EgovLoginController`를 `AuthService`로 전환 (JWT/세션 하이브리드 지원)
2. **게시판 (BBS)**: 전체 게시판 컨트롤러를 `BoardService` 기반으로 교체.
3. **사용자 관리**: 일반/기업/업무 사용자 관리를 `UserService` 기반으로 통합 및 JPA 전환.

---

## 3. 리스크 및 대응 방안

- **JSP 태그 라이브러리 호환성**: 신규 DTO가 기존 `ui:pagination` 등 eGov 전용 태그와 충돌할 가능성.
  - *대응*: 어댑터 레이어에서 `PaginationInfo` 객체를 수동으로 생성하여 전달함으로써 호환성 유지.
- **세션(Session) 동기화**: 레거시 `EgovUserDetailsHelper`와 신규 Spring Security Context 간의 연동 문제.
  - *대응*: `GlobalMenuAdvice`를 적용하여 인증 객체를 상호 호환되도록 주입.

---

## 4. 기능 마이그레이션 표준 절차

새로운 기능을 이관하거나 메뉴에 연결할 때는 아래의 표준 절차를 준수해야 합니다. (자세한 내용은 `.agent/workflows/feature-migration.md` 참조)

1.  **백엔드 정합성**: 패키지 구조(`egovframework.com`) 및 컨트롤러 API URL 확인.
2.  **메뉴 DB 등록**: 프로그램(`NPROGRMLIST`), 메뉴(`NMENUINFO`), 권한(`NMENUCREATDTLS`) 정보 등록.
3.  **보안 설정**: `EgovSecurityConfig`의 접근 제어 목록 업데이트 및 권한 검토.
4.  **프론트 어댑터**: JSP 전용 데이터 변환(Map/VO) 레이어 검증.
5.  **기능 검증**: CRUD 동작 확인 및 페이징(`PaginationInfo`) 엔진 정상 동작 확인.
6.  **아키텍처 최적화**: JPA 연관관계를 고려한 QueryDSL 성능 최적화 및 로그 연동.
