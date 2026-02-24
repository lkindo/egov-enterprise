import { test, expect } from '@playwright/test';

test.describe('Survey Module', () => {
    test.beforeEach(async ({ page }) => {
        // Login as Admin (webmaster)
        await page.goto('/login');
        await page.fill('input[name="id"]', 'webmaster');
        await page.fill('input[name="password"]', '1');
        await page.click('button[type="submit"]');
        
        // Wait for redirect
        await page.waitForURL('/');
    });

    test('should display survey list', async ({ page }) => {
        await page.goto('/survey');
        await expect(page.getByRole('heading', { name: '설문조사' })).toBeVisible();
        
        // Wait for list to load
        const listItems = page.locator('table tbody tr');
        // In a fresh dev environment, there might be no surveys, 
        // but we expect the container/table to be visible.
        await expect(page.locator('table')).toBeVisible();
    });

    test('should navigate to survey detail and back', async ({ page }) => {
        await page.goto('/survey');
        
        // Check if there is at least one survey to click
        const firstSurveyLink = page.locator('table tbody tr td a').first();
        if (await firstSurveyLink.isVisible()) {
            await firstSurveyLink.click();
            await expect(page).toHaveURL(/\/survey\/\d+/);
            await page.getByRole('button', { name: '목록' }).click();
            await expect(page).toHaveURL('/survey');
        }
    });
});
