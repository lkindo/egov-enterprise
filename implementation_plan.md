# 하이브리드 마이그레이션 3단계: 로그인/인증

> **목표**: 레거시 `EgovLoginService`를 Spring Security의 `AuthenticationManager`로 대체하고, 레거시 JSP 호환성을 위해 `LoginVO`를 추출하여 세션에 유지합니다.

## 사용자 리뷰 필요 사항
> [!IMPORTANT]
> 이 변경 사항은 핵심 로그인 로직(`EgovLoginController`)을 수정합니다.
> *   레거시 `EgovLoginService`는 더 이상 사용되지 않고 우회됩니다.
> *   단방향 해시(SHA-256) 지원은 `SecurityConfig`의 `EgovPasswordEncoder`를 통해 이미 구성되어 있습니다.
> *   `LoginVO`는 신규 `JPA User` 엔터티에서 매핑되어 여전히 세션에 저장되므로, 기존 JSP와의 하위 호환성이 유지됩니다.

## 변경 제안

### API 서버
#### [수정] [EgovLoginController.java](file:///d:/project/egov-enterprise/api-server/src/main/java/egovframework/let/uat/uia/web/EgovLoginController.java)
- `AuthenticationManager` 주입 (이미 존재함).
- `actionSecurityLogin` 메서드 수정:
    - `loginService.actionLogin(loginVO)` 호출 제거.
    - `authenticationManager.authenticate()` 구현.
    - `Authentication` 객체에서 `CustomUserDetails` 추출.
    - `mapToLoginVO(CustomUserDetails details)` 헬퍼 메서드 구현.
    - `User` 엔터티 필드를 `LoginVO` 필드로 변환 (매핑).
    - `actionSecurityProcess`에 실제 `Authentication` 객체 전달.
- `actionSecurityProcess` 수정:
    - `Authentication` 객체를 인자로 받도록 변경.
    - 전달받은 `Authentication` 객체를 사용하여 `SecurityContext` 설정.

## 검증 계획

### 자동화 테스트
- `gradlew :api-server:classes` 명령어로 컴파일 오류 확인.

### 수동 검증
1.  **로그인 테스트**:
    -   `/uat/uia/egovLoginUsr.do` 접속.
    -   테스트 계정: `admin` / `1` 로 로그인.
    -   메인 페이지로 정상 리다이렉트 되는지 확인.
2.  **세션 및 헤더 검증**:
    -   로그인 후 상단 메뉴(헤더)에 사용자 이름이 표시되는지 확인.
    -   이는 `LoginVO`가 세션에 정상적으로 존재함을 확인합니다 (`EgovIncHeader.jsp`는 `session.getAttribute("LoginVO")`를 사용).
3.  **로그아웃 테스트**:

## 하이브리드 마이그레이션 4단계: 게시판(BBS) 전체 이관

> **목표**: `EgovBBSManageController`의 모든 액션(`selectBoardList`, `selectBoardArticle`, `insertBoardArticle` 등)을 신규 `BoardService`로 대체합니다.

### API 서버
#### [수정] [EgovBBSManageController.java](file:///d:/project/egov-enterprise/api-server/src/main/java/egovframework/let/cop/bbs/web/EgovBBSManageController.java)
- **1. Service 교체**: `EgovBBSManageService` (Legacy) -> `BoardService` (New)
- **2. Adapter 메서드 확장**: `convertToMap`을 사용하여 목록/상세 조회 결과 변환.
- **3. 주요 메서드 재구현**:
    - **목록 조회**: `selectBoardList` -> `boardService.getBoardPosts` 호출. `PaginationInfo` 유지.
    - **상세 조회**: `selectBoardArticle` -> `boardService.getPostDetail` 호출.
    - **등록 페이지**: `addBoardArticle` -> 단순 뷰 리턴 (데이터 로딩 불필요).
    - **등록 처리**: `insertBoardArticle` -> `boardService.createPost` 호출.
    - **수정 페이지**: `updateBoardArticle` -> `boardService.getPostDetail` 호출 후 폼 데이터 바인딩.
    - **수정 처리**: `updateBoardArticle` (POST) -> `boardService.updatePost` 호출.
    - **삭제 처리**: `deleteBoardArticle` -> `boardService.deletePost` 호출.

### 데이터 검증 (DTO <-> VO)
- `BoardDto`는 `NttId`(Long)를 사용하지만, Legacy 코드는 `nttId`(Long)를 사용하므로 호환됨.
- `frstRegisterPnttm`(날짜) 포맷팅 주의 필요 (`yyyy-MM-dd` vs `yyyy-MM-dd HH:mm:ss`). Adapter에서 처리.

