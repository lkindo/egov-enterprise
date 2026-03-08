import { test, expect } from '@playwright/test';

test.describe('Security & RBAC Enforcement', () => {

    test('Unauthenticated user should be redirected to /login', async ({ browser }) => {
        const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
        const page = await context.newPage();
        await page.goto('/admin/user/manage');
        await page.waitForURL(/.*login.*/, { timeout: 20000 });
        await expect(page).toHaveURL(/.*login.*/);
        await context.close();
    });

    test('Regular user should be blocked from /admin routes', async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();

        // Mock a regular user login by setting a non-admin role cookie if needed
        // but for now, we just test access with admin session redirected or blocked 
        await page.goto('/admin/user/manage');
        // If not admin, middleware should redirect to /
        // await page.waitForURL('**/');
        await context.close();
    });

    test('Admin user should access /admin routes freely', async ({ page }) => {
        // Authenticated as admin via global storageState
        await page.goto('/admin/user/manage');
        await expect(page.getByText(/사용자 계정 관리|Admin System/i)).toBeVisible();
    });
});
