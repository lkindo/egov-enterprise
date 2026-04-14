# Task: Stabilizing Test and Production Environments

## Background
The user reported that modules pass tests but fail in the real environment. 
Parity between Testcontainers (PostgreSQL) and the real environment (Dockerized PostgreSQL) is critical.
Recent compilation errors in the frontend have been fixed.

## Checklist
- [x] **Think (Analysis)**: Identified missing imports and service discrepancies in the frontend causing "prod-only" build failures.
- [x] **Plan (Execution)**: Standardize `KnowledgeDto`, fix imports in `BBSDetailClient`, and fix `BoardAdminService` endpoints.
- [x] **Implement (Implementation)**: 
    - [x] Unified `KnowledgeDto` with qnaStatus, qnaCategory, eventDate.
    - [x] Fixed `lucide-react` imports in board detail pages.
    - [x] Added `createBoardArticle` to `BoardAdminService` mapping to `/api/v1/boards/posts`.
    - [x] Fixed `log4j-slf4j2-impl` conflict by global exclusion in `build.gradle`.
    - [x] Verified frontend build success (Exit code 0).
- [/] **Test (Verification)**:
    - [ ] Bring up Docker infrastructure (api-server, db).
    - [x] Run backend integration tests (`.\gradlew test` with `tc` profile).
    - [ ] Run frontend E2E tests (Playwright) against the live Docker environment.
- [ ] **Summarize (Reporting)**: Present the final stability report to the user.

## Current Progress
- **진행 상황 (15:26)**:
    - [x] 로깅 충돌 조치 완료 (`build.gradle`).
    - [x] Docker 파일 로그 권한 조치 완료.
    - [x] Actuator 보안 설정 허용 완료 (`ApiSecurityConfig.java`).
    - [/] 최종 `bootJar` 패키징 진행 중 (약 3-5분 소요 예상).
    - [ ] 이후 즉시 E2E 테스트(데이터 클린업 포함) 자율 실행 예정.
- Backend integration tests (Testcontainers) **PASSED** (Exit 0).
- **Bug Fix**: Resolved `log4j-slf4j2-impl` conflict by adding global exclusion in `build.gradle`.
- Docker infrastructure rebuild in progress (API server rebuilding after config change).
- Next: Verify backend health and run frontend Playwright E2E specs once Docker is ready.
