# Task: Stabilizing Test and Production Environments

## Background
The user reported that modules pass tests but fail in the real environment. 
Parity between Testcontainers (PostgreSQL) and the real environment (Dockerized PostgreSQL) is critical.
Recent compilation errors in the frontend have been fixed.

## Checklist
- [x] **Think (Analysis)**: Identified missing imports and service discrepancies in the frontend causing "prod-only" build failures.
- [x] **Plan (Execution)**: Standardize `KnowledgeDto`, fix imports in `BBSDetailClient`, and fix `BoardAdminService` endpoints.
- [/] **Implement (Implementation)**: 
    - [x] Unified `KnowledgeDto` with qnaStatus, qnaCategory, eventDate.
    - [x] Fixed `lucide-react` imports in board detail pages.
    - [x] Added `createBoardArticle` to `BoardAdminService` mapping to `/api/v1/boards/posts`.
    - [x] Verified frontend build success (Exit code 0).
- [ ] **Test (Verification)**:
    - [ ] Bring up Docker infrastructure (api-server, db).
    - [ ] Run backend integration tests (`.\gradlew test` with `tc` profile).
    - [ ] Run frontend E2E tests (Playwright) against the live Docker environment.
- [ ] **Summarize (Reporting)**: Present the final stability report to the user.

## Current Progress
- Frontend build is now passing.
- Backend Docker containers are being built/started.
- Next: Verify backend health and run E2E specs.
