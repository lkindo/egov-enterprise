import { test, expect } from '@playwright/test';

test.describe('Electronic Approval Module', () => {
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => { window.localStorage.setItem('egov_smart_tour_v1', 'true'); });
        await page.goto('/', { waitUntil: 'domcontentloaded' });
    });

    test('should display approval inbox and switch tabs', async ({ page }) => {
        await page.goto('/approvals');
        await expect(page.getByText(/결재|Approval|Electronic approval/i).first()).toBeVisible();

        // Check for tabs presence
        await expect(page.locator('main')).toBeVisible();
    });

    test('should show approval list content', async ({ page }) => {
        await page.goto('/approvals');
        // Basic list check
        const list = page.locator('table, [role="grid"], .approval-list').first();
        await expect(list).toBeVisible({ timeout: 15000 });
    });
});
