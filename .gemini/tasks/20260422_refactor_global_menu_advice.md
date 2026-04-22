# Task: Refactor GlobalMenuAdvice (2026-04-22)

## 1. Objectives
- Separate mapping logic from `GlobalMenuAdvice` to a service.
- Remove hardcoded URI/BBS mapping from the advice class.
- Create a reusable `MenuUIContext` DTO for legacy UI menu state.

## 2. Plan
- [x] Create `MenuUIContext` DTO in `foundation` or `business-suite`.
- [x] Create `MenuIntegrationService` in `business-suite`.
- [x] Move `flattenMenu` and `identifyProgrmFileNm` logic to `MenuIntegrationService`.
- [x] Refactor `GlobalMenuAdvice` to delegate work to `MenuIntegrationService`.
- [x] Verify Gradle build and tests.

## 3. Implementation Details
### 3.1 DTO: MenuUIContext
- `List<MenuDto> rootMenus`
- `List<MenuDto> flatMenus`
- `Long activeRootMenuId`
- `List<MenuDto> subMenus`

### 3.2 Service: MenuIntegrationService
- `processMenuContext(String uri, String bbsId, String contextPath)`

## 4. Progress
- [x] Initial design phase.
- [x] Implementation of DTO and Service.
- [x] Integration with GlobalMenuAdvice.
- [x] Build verification success.
