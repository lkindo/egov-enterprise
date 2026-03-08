import { test, expect } from '@playwright/test';

test.describe('Scrap Module', () => {
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

        await page.goto('/cop/scp');
    });

    test('should display scrap list', async ({ page }) => {
        await expect(page.getByText('스크랩 관리')).toBeVisible();
        await expect(page.locator('table')).toBeVisible();
    });

    test('should navigate to registration page', async ({ page }) => {
        const addBtn = page.getByRole('button', { name: /등록|추가|Add/i }).first();
        await expect(addBtn).toBeVisible();
        await addBtn.click();

        await expect(page).toHaveURL(/\/cop\/scp\/new/);
    });
});
