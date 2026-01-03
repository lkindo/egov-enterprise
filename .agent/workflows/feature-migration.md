---
description: 전자정부프레임워크 5.0 기반 기능 마이그레이션 및 메뉴 연결 표준 절차
---

# 기능 마이그레이션 및 메뉴 연결 워크플로우

이 워크플로우는 새로운 기능을 프로젝트에 통합하고 메뉴에 연결할 때 준수해야 할 표준 절차를 정의합니다.

### 1단계: [백엔드] 패키지 및 URL 정합성 확인
- `egovframework.let` -> `egovframework.com` 패키지 구조 전환 확인
- 컨트롤러의 `@RequestMapping` URL이 기존 JSP 링크 및 DB 등록 예정 URL과 일치하는지 확인

### 2단계: [DB] 프로그램 및 메뉴 데이터 등록
- **프로그램 관리 (`NPROGRMLIST`)**: 컨트롤러 URL 등록
- **메뉴 관리 (`NMENUINFO`)**: 상위/하위 계층 구조 설정
- **메뉴 생성 관리 (`NMENUCREATDTLS`)**: 권한별(예: webmaster) 메뉴 노출 설정

### 3단계: [보안] 권한 설정 및 아규먼트 리졸버 점검
- `EgovSecurityConfig.java`에서 신규 URL 패턴 접근 허용 확인
- `EgovSecurityArgumentResolver`를 통한 `LoginVO` 주입 상태 확인

### 4단계: [프론트] JSP 레이아웃 및 어댑터 검증
- `EgovIncLeftmenu.jsp` 등에서 메뉴 렌더링 확인
- 신규 DTO/Entity를 JSP가 인식할 수 있도록 `Map` 변환 Adapter 로직 구현

### 5단계: [검증] 기능 동작 및 페이징 확인
- CRUD(조회/상세/등록/수정/삭제) 동작 테스트
- `PaginationInfo`와 JPA `Pageable` 간 호환성 및 UI 출력 결과 확인

### 6단계: [고도화] 엔터프라이즈 표준 최적화
- MyBatis 로직을 JPA Entity 및 QueryDSL로 완전 전환
- `LogManageController` 연결을 통한 시스템 로그 및 예외 처리 강화
