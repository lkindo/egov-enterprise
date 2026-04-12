# Task: Gap Analysis and Mitigation Plan for Test vs Production Environment

## Status
- [x] Think (Analysis)
- [x] Think (Analysis)
- [x] Plan (Planning)
- [x] Implement (Proposing Mitigation)
- [x] Test (Verification of Strategy)
- [x] Summarize (Final Report)

## 1. Think (Analysis)
### Current Situation
- Modules pass tests but fail in production.
- Project uses: Spring Boot 3.4, Next.js 15, PostgreSQL 16, Testcontainers (available but underused), Playwright.
- E2E tests often use mocking (`page.route`) to speed up tests.
- Backend tests have 60% coverage goal, but many use H2 instead of PostgreSQL.

### Identified Gaps
1. **Mock Fidelity Gap**: `page.route` mocks may not reflect real API changes. (Addressed by Contract Testing P2)
2. **Environment Contamination**: Tests running on H2 (In-memory) vs. Production on PostgreSQL 16. (Identified in P3)
3. **Data Complexity**: Simple test strings vs. complex production data.
4. **Error Handling**: Lack of systematic error simulation.

## 2. Plan (Progress)
1. **[DONE] Schema-First Contract Testing**: Created `userManageSchema` and `validateContract` helper.
2. **[DONE] "No-Mock" Critical Path**: Created `01-admin-user-gold.spec.ts` for User Management.
3. **[IP] Database Parity Enhancement**: Noticed `application-test.yml` uses H2. Migrating to Testcontainers-based `application-tc.yml`.
4. **[TODO] Visual Regression Integration**: Implement snapshot testing for key dashboards.
5. **[TODO] Observability Feedback Loop**: Use production error logs to create "Regression Tests".

## 3. Implement (Next Step)
- Define a "Gold Flow" for User Management without mocks.
- Add Zod validation to a sample E2E test.
- Plan for Visual Regression setup.
