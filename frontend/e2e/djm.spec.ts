import { test, expect } from '@playwright/test';

test.describe('DeptJob Module', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/cop/smt/djm/selectDeptJobList');
    });

    test('should display dept job list', async ({ page }) => {
        await expect(page.getByText('부서업무 관리')).toBeVisible();
    });
});
