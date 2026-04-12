# Task: E2E Test Re-verification and Logic Improvement (04-06+)

## Background
- Aligning frontend and backend columns/DTOs was partially completed.
- Need to re-examine E2E tests starting from #4 (`04-dashboard-domain.spec.ts`, `05-security-domain.spec.ts`, `06-board-article-validation.spec.ts`, etc.).
- Identify gaps, improve test robustness, and suggest/implement production logic improvements.

## Checklist
- [x] **Think (Analysis)**: 
    - [x] Review `04-dashboard-domain.spec.ts` for data mapping and mock fidelity. (Weak assertions identified)
    - [x] Review `05-security-domain.spec.ts` for authentication/authorization edge cases. (CSRF fields verified)
    - [x] Review `06-board-article-validation.spec.ts` specifically for field alignment. (Missing unified fields identified)
    - [x] Compare tests with actual API responses/DTOs to ensure no field mismatches. (Confirmed `nttSj`, `qnaStatus`, `eventDate` mapping)
- [x] **Plan (Planning)**:
    - [x] Draft modifications for E2E tests to include strict assertions and unified fields.
    - [x] Identify logic improvements (Backend stats aggregation, DTO naming unification).
- [x] **Implement (Implementation)**:
    - [x] Update E2E tests 04 (Strict checks) and 06 (Unified fields).
    - [x] Implement backend aggregation for Board Stats (`BoardStatsResponse`, `BoardService.getBoardStats`).
    - [x] Unify DTO property names by adding alias fields to `BoardDto` (`knoNm`, `knoId`, etc.).
    - [x] Simplify `knowledgeService.ts` by removing manual mapping and using new `/stats` endpoint.
- [ ] **Test (Verification)**:
    - [ ] Run `playwright test` for updated specs. (Server booting)
- [ ] **Summarize (Reporting)**: Report findings and changes.

## Current Progress
- Started analysis of E2E tests #4, #5, #6.
