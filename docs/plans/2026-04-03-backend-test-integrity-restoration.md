# Backend Test Integrity Restoration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restore full compilation and execution of the backend test suite by fixing Mojibake encoding issues and correcting DTO/service drift.

**Architecture:** Systematic file-by-file restoration focusing on character encoding (UTF-8) and API alignment.

**Tech Stack:** JUnit 5, Mockito, Spring Boot Test, Gradle.

---

### Task 1: Fix Mojibake in Auth-related Service Tests

**Files:**
- Modify: `foundation/src/test/java/com/company/project/foundation/service/auth/AuthorManageServiceTest.java`
- Modify: `foundation/src/test/java/com/company/project/foundation/service/auth/AuthorRoleManageServiceTest.java`
- Modify: `foundation/src/test/java/com/company/project/foundation/service/auth/RoleManageServiceTest.java`
- Modify: `foundation/src/test/java/com/company/project/foundation/service/auth/UserAuthorityManageServiceTest.java`

**Step 1: Restore @DisplayName annotations**
Restore the broken characters to proper Korean text (e.g., `?뚯뒪??` -> `테스트`).

**Step 2: Commit**
```bash
git add foundation/src/test/java/com/company/project/foundation/service/auth/*.java
git commit -m "fix: restore Mojibake in auth service tests"
```

### Task 2: Fix Remaining Mojibake in Foundation Module

**Files:**
- Modify: All files identified with `grep` containing Mojibake in `@DisplayName`.

**Step 1: Systematic search and replace**
Identify and fix all remaining `?` characters in test annotations across `foundation` module.

**Step 2: Commit**
```bash
git add foundation/src/test/java/
git commit -m "fix: restore all remaining Mojibake in foundation tests"
```

### Task 3: Fix Field Typos in Log Tests

**Files:**
- Modify: `foundation/src/test/java/com/company/project/foundation/domain/log/UserLogTest.java`
- Modify: `foundation/src/test/java/com/company/project/foundation/domain/log/PrivacyLogTest.java`

**Step 1: Fix UserLogTest**
`rqsterId` -> `rqesterId`

**Step 2: Fix PrivacyLogTest**
Correct field names matching the record definition.

**Step 3: Commit**
```bash
git add foundation/src/test/java/com/company/project/foundation/domain/log/
git commit -m "fix: correct field typos in log domain tests"
```

### Task 4: Fix Service Integration Tests (Package/Import Mismatch)

**Files:**
- Modify: `foundation/src/test/java/com/company/project/foundation/service/auth/UserServiceIntegrationTest.java`
- Modify: `foundation/src/test/java/com/company/project/foundation/service/menu/MenuServiceIntegrationTest.java`

**Step 1: Fix imports**
Update `IntegrationTest` import to `com.company.project.foundation.support.IntegrationTest`.

**Step 2: Fix method calls**
`UserServiceIntegrationTest`: `getAllUsers()` or similar missing methods.

**Step 3: Commit**
```bash
git add foundation/src/test/java/com/company/project/foundation/service/
git commit -m "fix: update integration test imports and methods"
```

### Task 5: Final Build & Test Verification

**Step 1: Run all tests in foundation**
Run: `./gradlew :foundation:test`
Expected: BUILD SUCCESSful

**Step 2: Run all tests in business-suite**
Run: `./gradlew :business-suite:test`
Expected: BUILD SUCCESSful
