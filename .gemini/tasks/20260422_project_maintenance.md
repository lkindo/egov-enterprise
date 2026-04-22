# Task: Project Maintenance and Gitignore Optimization (2026-04-22)

## 1. Objectives
- Optimize `.gitignore` for `.gemini/tasks/` tracking.
- Cleanup unnecessary/temporary files and directories.
- Perform a health check based on `graphify` analysis.

## 2. Actions Taken
### 2.1 Gitignore Optimization
- Added `**/.gemini/*` to ignore local settings while keeping `!**/.gemini/tasks/` functional.
- Verified the negation pattern to ensure task logs are tracked.

### 2.2 Cleanup
- Removed empty directories: `records/`, `test-uploads/`.
- Deleted temporary root log: `server_log.txt`.
- Identified large log files in `api-server/logs` for future rotation.

### 2.3 Refactoring & Optimization
- Refactored `GlobalMenuAdvice` to separate UI mapping logic into `MenuIntegrationService`.
- Introduced `MenuUIContext` DTO for structured menu state management.
- Updated `logback-spring.xml` with `SizeAndTimeBasedRollingPolicy` to prevent huge log files.

### 2.4 Verification
- Added `legacy-js.spec.ts` for Playwright E2E verification of legacy JS assets.
- Verified backend build success via `./gradlew classes`.

## 3. Results
- Project hygiene improved.
- AI state externalization (tasks) is now reliably tracked by Git.

## 4. Next Steps
- Refactoring completed for menu advice.
- E2E coverage extended for legacy assets.
- Log rotation policy hardened.
