---
description: 레거시 모듈 활성화 시 발생하는 공통 오류(Bean 생성, 404, 바인딩) 해결 표준 절차
---

# 레거시 오류 해결 워크플로우 (Legacy Error Resolution Workflow)

이 워크플로우는 전자정부프레임워크 레거시 모듈을 `api-server`로 가져와 활성화할 때 빈번하게 발생하는 오류들을 체계적으로 해결하기 위한 가이드입니다.

### 1단계: 서버 기동 오류 (Bean Creation Exception)
서버 시작 시 `BeanCreationException` 또는 `UnsatisfiedDependencyException` 발생 시 수행합니다.

1.  **원인 식별**: 로그에서 "No bean named 'xxx' available" 오류 메시지 확인.
    -   주로 ID Generation Service(`...IdGnrService`) 누락이 원인.
2.  **XML 분석**: 레거시 프로젝트의 `context-idgn-*.xml` 파일에서 해당 Bean 정의 확인.
3.  **Java Config 이관**: `LegacyConfig.java`에 `@Bean`으로 등록.
    -   `EgovTableIdGnrServiceImpl` 또는 `EgovSequenceIdGnrServiceImpl` 사용.
    -   `EgovIdGnrStrategyImpl` 설정 포함.

### 2단계: 404 Not Found (Controller Scanning)
메뉴 클릭 시 404 오류가 발생하고, 서버 로그에 매핑 정보가 없을 때 수행합니다.

1.  **Controller 스캔 확인**: `ApiServerApplication.java` 의 `@ComponentScan.Filter` 확인.
    -   해당 패키지(예: `egovframework.com.cop.bbs.web`)가 제외(`excludeFilters`)되어 있는지 확인.
    -   제외되어 있다면 주석 처리하여 활성화.
2.  **URL 매핑 확인**: `NPROGRMLIST` 테이블의 URL과 Controller의 `@RequestMapping` 일치 여부 확인.
3.  **Modern Conflict 확인**: 동일한 URL을 처리하는 Modern Controller가 존재하는지 확인.
    -   존재한다면 Modern Controller 우선 (Legacy 비활성화).
    -   Legacy 기능을 써야 한다면 Modern Controller 비활성화.

### 3단계: 500 Internal Server Error (Data Binding/JSP)
페이지 진입 또는 등록/수정 시 500 오류 발생 시 수행합니다.

1.  **JSP 존재 확인**: `src/main/webapp/WEB-INF/jsp` 경로에 해당 JSP 파일이 있는지 확인.
    -   없다면 레거시 소스에서 복사 (`webapp` 폴더 구조 유지).
2.  **Model Attribute 불일치 해결**:
    -   **현상**: `java.lang.IllegalStateException: Neither BindingResult nor plain target object for bean name 'xxx' available as request attribute`
    -   **분석**: JSP의 `<form:form modelAttribute="xxx">` 값과 Controller의 `model.addAttribute("yyy", ...)` 값이 다른지 확인.
    -   **조치**: Controller의 Attribute Name을 JSP와 일치시킴 (예: `cmmntyVO` -> `commuMasterVO`).
3.  **Detail View 불일치**:
    -   JSP에서 `${result.frstRegisterNm}` 처럼 사용하는데 Controller는 `model.addAttribute("vo", ...)`로 넘기는지 확인.
    -   Controller를 `model.addAttribute("result", ...)`로 수정.

### 4단계: 검증 (Verification)
1.  **빌드 및 기동**: `./gradlew :api-server:bootRun`
2.  **메뉴 접근**: 해당 메뉴 클릭하여 리스트 조회 정상 여부 확인.
3.  **기능 테스트**: 등록/수정/상세조회/삭제 프로세스 수행.
