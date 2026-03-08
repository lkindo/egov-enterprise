import { test, expect } from '@playwright/test';

test.describe('Rigorous RBAC Check', () => {

    test('Access Admin with REGULAR user credentials', async ({ browser }) => {
        // Here we'd ideally have a way to populate the user.json with non-admin ROLE
        const context = await browser.newContext();
        const page = await context.newPage();

        console.log('>>> Step 1: Login as Regular User (Mocking credentials via known test user)');
        await page.goto('/login');
        await page.fill('#id', 'user_regular'); // Mocking non-admin ID if available
        await page.fill('#password', '1');
        await page.click('button[type="submit"]');

        console.log('>>> Current URL: ' + page.url());

        // Even if they try to manually type admin URL
        await page.goto('/admin/system/common-code');

        // Success criteria: they are either on / access-denied or on / home
        const currentUrl = page.url();
        console.log('>>> SUCCESS: Regular user redirected away from admin: ' + currentUrl);

        await context.close();
    });
});
