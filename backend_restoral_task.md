# Task: Native Backend Connection Restoral and Integration Testing (Stabilization Loop 1)

## Status: IN_PROGRESS

### Checklist:
- [x] [Think] Locate Java backend source and build tools (Maven/Gradle)
- [x] [Plan] Check for running Java processes and port conflicts
- [x] [Implement] Start backend natively (e.g., mvnw spring-boot:run)
- [x] [Test] Verify localhost:8080 accessibility and health (401 response confirmed)
- [x] [Summarize] Report result and move to integration tests
- [x] [Stabilize] 02-board-domain.spec.ts integration (No mocks, 404s resolved)
- [x] [Stabilize] 01-admin-domain.spec.ts integration (Internal mocks removed, real session active)
- [ ] [Audit] 03-collaboration, 04-dashboard, 05-security domains

### Logs:
- 2026-03-29: Initiated backend restoral task.
- 2026-03-29: Started 'api-server' using gradlew bootRun on port 8080.
- 2026-03-29: Integrated 02-board-domain with live backend.
- 2026-03-29: Fixed 404 in Approvals module (/approval/inbox -> /approvals).
- 2026-03-29: Cleaned up legacy mocks in 01-admin-domain for strict integration.
