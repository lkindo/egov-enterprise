# 20260418 Modernization: ComDefaultVO to BaseSearchDto Migration

본 문서는 `foundation` 및 `business-suite` 모듈의 레거시 `ComDefaultVO` 의존성을 제거하고, 프로젝트 표준인 `BaseSearchDto`로 전환하는 작업 진행 상태를 기록한다.

## 작업 체크리스트

### 1. Foundation 모듈 리팩토링
- [x] **Service Layer Refactoring**
    - [x] `LoginPolicyManageService`
    - [x] `UserAuthorityManageService`
    - [x] `RoleManageService`
    - [x] `AuthorManageService`
    - [x] `AuthorRoleManageService`
    - [x] `ProgramService`
    - [x] `MenuService`
    - [x] `LoginLogManageService`
    - [x] `LogManageService`
    - [x] `GroupManageService`
- [x] **Unit Test Refactoring**
    - [x] `LoginPolicyManageServiceTest`
    - [x] `UserAuthorityManageServiceTest`
    - [x] `RoleManageServiceTest`
    - [x] `AuthorManageServiceTest`
    - [x] `AuthorRoleManageServiceTest`
    - [x] `ProgramServiceTest`
    - [x] `MenuServiceTest`
    - [x] `LoginLogManageServiceTest`
    - [x] `LogManageServiceTest`
    - [x] `GroupManageServiceTest`

### 2. Business Suite 모듈 리팩토링
- [x] **Service Layer Refactoring**
    - [x] `ScheduleService`
- [x] **Unit Test Refactoring**
    - [x] `ScheduleServiceTest`

### 3. 검증 및 빌드
- [x] **Foundation 모듈 테스트 통과** (`./gradlew :foundation:test`)
- [x] **전체 프로젝트 빌드 성공** (`./gradlew build -x test`)

## 주요 변경 사항
- `egovframework.com.cmm.ComDefaultVO`를 전수 조사하여 제거.
- `nuri.foundation.domain.common.BaseSearchDto`로 검색 및 페이징 파라미터 표준화.
- 불필요한 VO 의존성을 제거하여 아키텍처 일관성 향상.

---
*Status: COMPLETED (2026-04-18)*
