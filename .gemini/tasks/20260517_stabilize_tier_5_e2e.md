# Task: Stabilize Tier 5 E2E Tests (FAQ Lifecycle Selector Bug Fix)

- **Date**: 2026-05-17
- **Status**: COMPLETED ✅
- **Objective**: Resolve the hang/timeout issue in E2E Tier 5 (`05-public-experience.spec.ts`) during the FAQ Lifecycle creation phase and ensure a 100% Green Run.

---

## 1. 🔍 Root Cause Investigation

- **Issue**: E2E test was freezing during "Admin: Create FAQ" action in `KnowledgePage.ts:createFAQ`.
- **Finding**: 
  - The page object `KnowledgePage.ts` was waiting for `input[name="nttSj"]` to be visible and attempted to fill it.
  - However, in the modernized frontend component `BoardRegistClient.tsx`, the field had been updated to follow the new v5 database-standard naming convention: `pstTtl` (Post Title) instead of the legacy `nttSj` (Notice Subject).
  - The element featured `data-testid="article-title-input"` and `name="pstTtl"`.
  - As a result, the old selector was never resolved, causing Playwright to wait indefinitely (hang) until timeout.

---

## 2. 🛠️ Implementation & Fixes

- **Target File**: `frontend/e2e/pages/KnowledgePage.ts`
- **Changes**:
  - Updated legacy `nttSj` selectors inside `createFAQ()` method to target the modernized element:
    ```typescript
    // Before
    await this.page.locator('input[name="nttSj"]').fill(question);

    // After
    await this.page.locator('input[data-testid="article-title-input"], input[name="pstTtl"]').fill(question);
    ```

---

## 3. 🧪 Verification & Results

- **Command**: `npx playwright test e2e/05-public-experience.spec.ts`
- **Execution Status**: **SUCCESS (Green Run)** ✅
- **Log Metrics**:
  - Total Tests: **12 Tests** (Setup: 2, `tier-5-public` suite: 5, `full-suite` suite: 5)
  - Result: **12 passed (8.8m)**
  - Cleanup: E2E generated DB entities (including 10 boards, 5 polls, 2 posts) successfully cleared from Database.
