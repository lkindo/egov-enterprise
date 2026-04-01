# IDE Problems Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Resolve unused imports and resource leak warnings identified by the IDE.

**Architecture:** Remove unused imports in service files and address resource leak warnings in tests.

**Tech Stack:** Java, Spring, Lombok, Testcontainers.

---

### Task 1: Remove Unused Imports in Services

**Files:**
- Modify: `business-suite/src/main/java/com/company/project/business/service/deptjob/DeptJobService.java:18`
- Modify: `foundation/src/main/java/com/company/project/foundation/core/service/BaseAbstractService.java:12`
- Modify: `foundation/src/main/java/com/company/project/foundation/service/code/CommonCodeService.java:10`
- Modify: `foundation/src/main/java/com/company/project/foundation/service/template/TmplatInfoService.java:8`

**Step 1: Remove `import lombok.RequiredArgsConstructor;` from `DeptJobService.java`**
Line 18.

**Step 2: Remove `import java.util.Objects;` from `BaseAbstractService.java`**
Line 12.

**Step 3: Remove `import lombok.RequiredArgsConstructor;` from `CommonCodeService.java`**
Line 10.

**Step 4: Remove `import lombok.RequiredArgsConstructor;` from `TmplatInfoService.java`**
Line 8.

**Step 5: Verify imports are gone**
Use `view_file` to confirm.

### Task 2: Investigate and Fix Resource Leaks in Tests

**Files:**
- Modify: `foundation/src/test/java/com/company/foundation/support/PostgresContainerTest.java:29`
- Modify: `foundation/src/test/java/com/company/foundation/support/TestcontainersConfig.java:22`

**Step 1: Fix Resource Leak in `PostgresContainerTest.java`**
Apply `@SuppressWarnings("resource")` to silence false positive for the `@Container` field.
Also, apply try-with-resources for `ResultSet` in test methods.

**Step 2: Fix Resource Leak in `TestcontainersConfig.java`**
Apply similar fix if needed, though `@Bean(destroyMethod = "stop")` should be enough.
If it still warns, consider adding `@SuppressWarnings("resource")`.

**Step 3: Fix `ResultSet` leaks**
In `PostgresContainerTest.java`, ensure `ResultSet` is closed.
```java
        try (Connection connection = postgres.createConnection("");
                Statement statement = connection.createStatement();
                ResultSet resultSet = statement.executeQuery("SELECT 1")) {
```

### Task 3: Final Verification

**Step 1: Run tests to ensure no regressions**
Run: `./gradlew :foundation:test --tests com.company.foundation.support.*`

**Step 2: Check for any new warnings**
Verify the file contents.

### Task 4: Commit Changes

**Step 1: Commit all fixes**
`git add ...`
`git commit -m "chore: fix unused imports and resource leak warnings in Testcontainers"`
