# Implementation Plan: Backend Domain Integrity & Performance Refactoring

**Design Doc**: [2026-05-01-backend-refactoring-design.md](file:///d:/project/egov-enterprise/docs/plans/2026-05-01-backend-refactoring-design.md)

## Phase 1: Foundation (User Domain) Optimization

### Task 1: Refactor User Domain with QueryDSL Projections & Layer Isolation

**Owner:** `codex`

**Files:**
- Modify: `foundation/src/main/java/nuri/foundation/service/user/UserService.java`
- Modify: `foundation/src/main/java/nuri/foundation/domain/user/repository/UserRepository.java`
- Create: `foundation/src/main/java/nuri/foundation/domain/user/repository/UserRepositoryCustom.java`
- Create: `foundation/src/main/java/nuri/foundation/domain/user/repository/UserRepositoryImpl.java`
- Modify: `api-server/src/main/java/nuri/api/controller/UserApiController.java`

**Acceptance Criteria:**
- `UserService.getPagedUserList` uses `UserRepository.search` (QueryDSL) instead of manual stream mapping.
- `UserApiController` does not import `nuri.foundation.domain.user.entity.Role`.
- All User API tests pass.

**Verify:**
`./gradlew :foundation:test --tests "nuri.foundation.service.user.UserServiceTest"`

---

## Phase 2: Business-Suite (Board Domain) Optimization

### Task 2: Standardize Board Mapping and Query Patterns

**Owner:** `codex`

**Files:**
- Modify: `business-suite/src/main/java/nuri/business/service/board/BoardService.java`
- Modify: `business-suite/src/main/java/nuri/business/service/board/dto/BoardDto.java`
- Create: `business-suite/src/main/java/nuri/business/service/board/mapper/BoardMapper.java`
- Modify: `business-suite/src/main/java/nuri/business/domain/board/BoardRepositoryImpl.java`

**Acceptance Criteria:**
- `BoardDto` static mapping methods are replaced by `BoardMapper` (MapStruct).
- `BoardService` uses `BoardMapper` for entity-DTO conversion.
- `BoardRepositoryImpl` projections are updated to match the new `BoardMapper` structure if needed.

**Verify:**
`./gradlew :business-suite:test --tests "nuri.business.service.board.BoardServiceTest"`

---

## Phase 3: Validation & Quality Guardrails

### Task 3: Implement Declarative Validation & Audit

**Owner:** `codex`

**Files:**
- Modify: `foundation/src/main/java/nuri/foundation/service/user/dto/UserDto.java`
- Modify: `business-suite/src/main/java/nuri/business/service/board/dto/BoardSaveRequest.java`
- Modify: `api-server/src/main/java/nuri/api/controller/UserApiController.java`
- Modify: `business-suite/src/main/java/nuri/business/controller/BoardApiController.java` (if exists, or relevant controller)

**Acceptance Criteria:**
- `@NotBlank`, `@Size`, and other Jakarta Validation annotations added to Request DTOs.
- `@Valid` annotation used in Controller methods.
- Redundant manual validation checks removed from Services.

**Verify:**
`./gradlew test` (Whole project build to ensure no regression)
