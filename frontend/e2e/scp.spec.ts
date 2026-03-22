import { test, expect } from '@playwright/test';

test.describe('Scrap Module', () => {
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => { window.localStorage.setItem('egov_smart_tour_v1', 'true'); });
        await page.goto('/', { waitUntil: 'domcontentloaded' });
    });

    test('should display scrap list', async ({ page }) => {
        await page.goto('/cop/scp');
        await expect(page.locator('main')).toBeVisible();
        await expect(page.getByText(/스크랩|Scrap/i).first()).toBeVisible();
    });

    test('should navigate to registration page', async ({ page }) => {
        await page.goto('/cop/scp');
        const addBtn = page.getByRole('button', { name: /등록|추가|Create|Add/i }).first();
        if (await addBtn.isVisible()) {
            await addBtn.click();
            await expect(page).toHaveURL(/.*new|.*insert/);
        }
    });
});
