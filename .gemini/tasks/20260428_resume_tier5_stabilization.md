# Task: Tier 5 E2E Test Stabilization (Resume)

- **Date**: 2026-04-28
- **Status**: In Progress
- **Objective**: Finalize stabilization of `05-public-experience.spec.ts`.

## Progress Summary
- [x] Fixed Poll data binding (`list` vs `content`).
- [x] Improved Poll sorting and search parameters.
- [x] Refactored `PromotionPage.ts` for stable date input and image upload.
- [x] Added diagnostic logging for FAQ/Knowledge Hub.

## Remaining Sub-tasks
- [ ] Verify FAQ visibility in Knowledge Hub (Portal).
- [ ] Run full Tier 5 E2E suite and ensure 100% pass rate.
- [ ] Cleanup diagnostic logs and temporary files.

## Current Findings
- FAQ might have a timing issue or incorrect locator in the Portal's Knowledge Hub.
- Backend services are stable, but frontend UI might need better wait conditions.
