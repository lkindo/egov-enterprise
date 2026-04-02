# Implementation Plan: Fix Massive Compilation Errors & Restore Test Integrity

## Identified Problems
1.  **Mojibake / File Corruption**: MANY files have corrupted `@DisplayName` strings. (e.g., `테스트` -> `?스??`).
2.  **DTO to Record Refactoring Drift**: `AuthApiControllerTest` uses `LoginRequestDto` while it should be `LoginRequest` (record).
3.  **API/Method/DTO naming**: `CommonCodeService` methods and `CmmnCodeDto` had partial renaming.
4.  **Field typos**: `InstitutionCodeTest`, `UserLogTest`, `PrivacyLogTest` have typos in field names (`institytCode`, `rqsterId`, etc.).
5.  **Package Mismatch**: `IntegrationTest` annotation is in `com.company.project.foundation.support` but tests look in `com.company.project.foundation`.
6.  **Missing Source Classes**: `LogSummary.java` is missing. (Likely was renamed to something else or accidentally deleted).

## Step-by-Step Fixes

### 1. Fix Mojibake in All Affected Files
- [ ] Systematically search for `@DisplayName("...` that are broken and restore them to `@DisplayName("... 테스트")`.
- [ ] Fix lines that don't have properly closed strings.

### 2. Update AuthApiControllerTest.java
- [x] Update to use `LoginRequest` and `TokenResponse` records.
- [x] Fix field names (`userId`).

### 3. Update CommonCodeApiControllerTest.java
- [x] Rename `CodeDto` -> `CmmnCodeDto`.
- [x] Fix service method calls (`selectCommonCodeList` -> `selectCmmnCodeList`).

### 4. Fix Domain Tests (Field Typos)
- [x] `InstitutionCodeTest.java`: `institytCode` -> `insttCode`, `allInsttNm` -> `allInsttNm`.
- [ ] `UserLogTest.java`: `rqsterId` -> `rqesterId`.
- [ ] `PrivacyLogTest.java`: `requesterId` check and update.

### 5. Fix Service Integration Tests (Package Mismatches & Methods)
- [ ] `UserServiceIntegrationTest.java`: Fix `IntegrationTest` import and `getAllUsers()` call.
- [ ] `MenuServiceIntegrationTest.java`: Fix `IntegrationTest` import.

### 6. Restore Missing Source Classes
- [ ] Re-create or find `LogSummary.java`.

### 7. Global Exception / Response Tests
- [ ] Fix minor type mismatches and missing methods in `ApiResponseTest`, `GlobalExceptionHandlerTest`.

---
## Progress
- [ ] Mojibake fix
- [x] AuthApiControllerTest update
- [x] CommonCodeApiControllerTest update
- [x] InstitutionCodeTest fix
- [ ] User/Privacy Log Test fix
- [ ] IntegrationTest import fix
- [ ] Build Verification
