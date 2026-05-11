# Task: E2E Tier Testing with DB Refactoring Validation

- **Date**: 2026-05-11
- **Status**: In Progress
- **Topic**: E2E Testing

## Objectives
- Run E2E tests tier by tier (Tier 1 to Tier 22).
- Identify and fix issues caused by DB refactoring.
- Report completion after each tier.
- Follow "3-retry then divide & conquer" strategy.

## Checklist
- [x] **Think** — Environment setup and tier identification
- [x] **Plan** — Define execution sequence and retry logic
- [x] **Implement** — Execute E2E tests and apply fixes
- [ ] **Test** — Verify all tiers pass
- [ ] **Summarize** — Final report

## Progress Tracker
- [x] **Backend Stabilization**: Resolved Hibernate schema validation errors caused by DB refactoring.
    - Updated `SurveyRespondent` entity to match `nqustnrrespondinfo` table and removed missing `respondId` column.
    - Fixed `QustnrTmplat` column type mismatch (`bytea` vs `String`).
    - Temporarily set `ddl-auto: none` to ensure stable startup during E2E runs.
- [x] **Tier 1 (Core Base)**: COMPLETED (Login & Dashboard verified).
- [x] **Tier 2 (Admin System)**: COMPLETED (10/10 tests passed).
- [x] **Tier 3 (Board/Community)**: COMPLETED (14/14 tests passed).
- [ ] **Tier 4 (Quality & Resilience)**: Delegated to Gemini (YOLO mode).
- [ ] **Tier 5 (Public Experience)**: Delegated to Gemini (YOLO mode).
- [ ] **Tier 6 (Ops Governance)**: Pending.
- [ ] **Tier 7 (Productivity Suite)**: Pending.
- [ ] **Tier 8 (Collaboration)**: Pending.
- [ ] **Tier 9 (Observability)**: Pending.
- [ ] **Tier 10 (Extension)**: Pending.
- [ ] **Tier 11 (Enterprise Workflow)**: Pending.
- [ ] **Tier 12 (Notification)**: Pending.
- [ ] **Tier 13 (Mail)**: Pending.
- [ ] **Tier 14 (Admin Workflow)**: Pending.
- [ ] **Tier 15 (Collaboration Extension)**: Pending.
- [ ] **Tier 16 (System Observability)**: Pending.
- [ ] **Tier 17 (Support Governance)**: Pending.
- [ ] **Tier 18 (Business Extension)**: Pending.
- [ ] **Tier 19 (Hierarchy Modernization)**: Pending.
- [ ] **Tier 20 (Common Security Validation)**: Pending.
- [ ] **Tier 21 (Advanced Resilience)**: Pending.
- [ ] **Tier 22 (Deep Security Guard)**: In Progress (Directly managed by Claude).


## Logs
### 2026-05-11 (Phase 1)
- **Status**: Backend up, Tier 1 running.
- **Fixes**:
    - `SurveyRespondent.java`: Table name updated to `NQUSTNRRESPONDINFO`, `respondId` removed.
    - `QustnrTmplat.java`: `qustnrTmplatImageInfo` type changed to `byte[]`.
    - `application.yml`: `ddl-auto` set to `none`.
- **E2E Progress**: 
    - Tier 1-3: COMPLETED.
    - Tier 4-8: Executing in parallel (2 workers).
- **Action**: Optimized execution using 4 workers after user suggestion.
### 2026-05-11 (Phase 4)
- **Status**: Strategy shifted to REVERSE ORDER (Tier 22 -> Tier 4).
- **Delegation**: Tiers 4 & 5 delegated to Gemini CLI in YOLO mode.
- **Direct Execution**: Claude is directly handling Tier 22 and will move downwards.
- **Environment Note**: Encountered `AttachConsole failed` in Gemini CLI, attempting `--raw-output` to bypass PTY issues.
