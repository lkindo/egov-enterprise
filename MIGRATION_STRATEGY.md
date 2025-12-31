# Hybrid Migration Strategy: Backend First, Frontend Later

> **작성일**: 2025-12-28
> **목표**: 기존 JSP UI를 유지하면서 백엔드 로직을 Core Spring Boot(JPA/QueryDSL)로 현대화하는 "Backend First" 전략을 수립합니다.

---

## 1. 전략 개요 (Hybrid Approach)

"빅뱅(Big Bang)" 방식의 리스크를 줄이기 위해, **프론트엔드(JSP)는 유지하되 백엔드(Service/Repository)를 교체**하는 방식을 채택합니다.

### 1.1 아키텍처 변화
- **AS-IS**: `Controller` → `Service(Legacy)` → `DAO(MyBatis/Map)` → `DB`
- **TO-BE (Transient)**: `Controller` → **`Service(Modern JPA)`** → `Adapter` → `JSP`
- **TO-BE (Final)**: `Controller(REST)` → `Service(Modern JPA)` → `React/Next.js`

### 1.2 핵심 원칙
1. **사용자 경험 유지**: 마이그레이션 중에도 기존 JSP 화면은 동일하게 동작해야 한다.
2. **데이터 중심**: DB 스키마와 엔터티(JPA)를 우선 정립한다.
3. **점진적 교체**: 메인 페이지와 공통 메뉴부터 시작하여 업무 단위로 서비스를 교체한다.
4. **패키지 표준화**: 기존 `egovframework.let` (Light) 패키지 의존성을 `egovframework.com` (Common 5.0) 패키지로 전환한다.


---

## 2. 상세 마이그레이션 계획

### Phase 1: 관리자 공통 메뉴 (Admin Common Menu)

사이트의 네비게이션(헤더, 좌측 메뉴)을 담당하는 로직을 신규 `MenuService`로 교체합니다.

#### 현재 상태 (Analysis)
- **Controller**: `EgovMainController`
- **View**: `EgovIncHeader.jsp`, `EgovIncLeftmenu.jsp`
- **Legacy Service**: `egovframework.com.sym.mnu.mpm.service.EgovMenuManageService`
- **Data Requirement**:
  - `list_headmenu` (List)
  - Item Structure: `menuNo`, `menuNm`, `chkURL`, `children` (Deep copy)

#### 작업 계획 (Action Plan)
1. **신규 서비스 검증**: `common-service`의 `MenuService.getMenuHierarchy()`가 트리를 올바르게 반환하는지 확인.
2. **Controller 수정**:
   - `EgovMainController`에 `com.company.project.service.menu.MenuService` 주입.
   - 기존 `meunManageService` 호출 코드를 주석 처리.
3. **Data Adapter 구현**:
   - `MenuDto` (New) → `Legacy Map/VO` 변환 로직 구현.
   - JSP가 기대하는 계층 구조(`children` 필드 포함)로 변환하여 모델에 담음.
4. **검증**: 메뉴 클릭 시 이동, 하위 메뉴 펼침 동작 확인.

---

### Phase 2: 메인 페이지 (Main Page)

메인 페이지의 콘텐츠(공지사항, 자료실 등 게시판 미리보기)를 신규 `BoardService`로 교체합니다.

#### 현재 상태 (Analysis)
- **Controller**: `EgovMainController`
- **View**: `EgovMainView.jsp`
- **Legacy Service**: `egovframework.com.cop.bbs.service.EgovBBSManageService`
- **Data Requirement**:
  - `notiList` (공지사항), `bbsList` (갤러리/할일)
  - Item Fields: `nttSj` (제목), `frstRegisterPnttmStr` (날짜), `ntcrNm` (작성자)

#### 작업 계획 (Action Plan)
1. **신규 서비스 기능 추가 필요**:
   - `BoardService` (New)에 "최신 게시글 N개 조회" 기능 구현 필요 (`findLatestArticles(boardId, limit)`).
   - 혹은 `Pageable`을 사용하여 상위 N개만 조회.
2. **Controller 수정**:
   - `EgovMainController`에 `com.company.project.service.board.BoardService` 주입.
   - `BBSMSTR_AAAAAAAAAAAA` (공지사항) 및 `BBSMSTR_CCCCCCCCCCCC` (자료실) 데이터 조회 연결.
3. **Data Adapter 구현**:
   - `BoardDto/ArticleDto` → `Map` 변환.
   - 날짜 포맷팅 (`yyyy-MM-dd`) 처리 (`frstRegisterPnttmStr`).
4. **검증**: 메인 페이지 진입 시 DB 데이터가 정상 출력되는지 확인.

---

### Phase 3: 점진적 확산 (Gradual Rollout)

위 패턴을 기반으로 주요 업무 모듈을 순차적으로 전환합니다. 이때 `egovframe-template-common-components-5.0.0`을 소스로 사용하므로 패키지명 변경(`let` -> `com`)에 따른 Import 수정이 필수적입니다.

1. **로그인/권한**: `EgovLoginController` -> `AuthService` (JPA/JWT 기반 세션 호환)
2. **게시판(BBS)**: `EgovBBSManageController` -> `BoardService` 및 `egovframework.com.cop.bbs` 패키지 사용
    - *Note*: `EgovMainController` 등에서 참조하는 `BoardVO` 등의 import 경로를 `egovframework.let`에서 `egovframework.com`으로 수정해야 함.
3. **사용자 관리**: `EgovUserManageController` -> `UserService`

---

## 3. 리스크 및 대응

- **JSP 태그 라이브러리 호환성**: 신규 DTO가 기존 eGovFrame 태그(`ui:pagination` 등)와 호환되지 않을 수 있음.
  - *대응*: Adapter에서 `PaginationInfo` 객체를 명시적으로 생성하여 모델에 전달.
- **세션 호환성**: Legacy는 `EgovUserDetailsHelper`를 사용, 신규는 Spring Security Context 사용.
  - *대응*: `GlobalMenuAdvice` 또는 Controller 진입점에서 Principal 동기화 로직 적용.
