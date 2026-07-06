# Task: Modernizing Administrative Board Portal & Stability Audit

## Status
- Date: 2026-05-09
- Progress: 95% (Validation in progress)
- Objective: Modernize board list UI, fix console errors, and align test suite with Bento Grid design.

## Checklist
- [x] **UI Optimization**: Fix Board Master horizontal scroll (truncate titles, remove icons).
- [x] **Stability**: Fix hidden input `null` warning in `BoardDetailClient`.
- [x] **Type Alignment**: Update `StandardDataTable` and `HubMetricCard` props.
- [x] **Unit Test Audit**: 
  - [x] Update `UserManageClient.test.tsx` (Security/User Management strings).
  - [x] Update `CommentSection.test.tsx` (React 19 Server Actions & Optimistic UI mocks).
  - [x] Update `LoginPage.test.tsx` (Korean labels & Premium UI alignment).
  - [x] Update `ObservabilityPage.test.tsx` (Text mismatch fix).
- [ ] **Final Validation**: 
  - [x] Run `npm run test` (All passed).
  - [ ] Run `npm run test:e2e` (Currently running).

## Key Changes
### Board UI
- Reduced title font sizes and added `truncate` in `BoardTemplates.tsx` and `master/page.tsx`.
- Removed decorative icons from board titles to increase information density.

### Component Props
- Updated `StandardDataTable`'s `Column` interface to support row indexing `(item, index) => ReactNode`.
- Added `unit` prop to `HubMetricCard` for better observability display.

### Test Refactoring
- `CommentSection.test.tsx` now mocks `commentActions` and `framer-motion`, aligning with the Server Actions architecture.
- `LoginPage.test.tsx` now uses Korean strings ('아이디', '비밀번호', '로그인') matching the premium dashboard style.

## Next Steps
- Finalize E2E test report.
- Visual QA for any remaining layout breaks.
