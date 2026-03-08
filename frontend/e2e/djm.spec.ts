import { test, expect } from '@playwright/test';

test.describe('DeptJob Module', () => {
    test.beforeEach(async ({ page }) => {
        // Bypass onboarding tour
        await page.addInitScript(() => {
            window.localStorage.setItem('egov_smart_tour_v1', 'true');
        });

        // Login first
        await page.goto('/login');
        await page.fill('#id', 'webmaster');
        await page.fill('#password', '1');
        await page.click('button[type="submit"]');
        await page.waitForURL('/');

        await page.goto('/smart-toolkit/dept-job');
    });

    test('should display dept job list', async ({ page }) => {
        await expect(page.getByText('부서업무 관리')).toBeVisible();
        await expect(page.locator('table')).toBeVisible();
    });
});
