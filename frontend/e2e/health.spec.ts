import { test, expect } from '@playwright/test';

test('Public Page Health Check', async ({ page }) => {
    // No login required
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/Login|로그인|E-GOV/i);
    console.log('>>> Public Login page is accessible!');
});
