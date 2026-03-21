import { test, expect } from './fixtures/base-test';

test.describe('Admin User Management - Optimized with POM', () => {
    test.use({ storageState: 'playwright/.auth/admin.json' });

    test('Modern HUB List Access', async ({ userAdminPage }) => {
        await userAdminPage.goto();
        await userAdminPage.verifyHUB();

        // At least some user should be present
        const userItem = userAdminPage.page.getByText(/webmaster|관리자/i);
        await expect(userItem.first()).toBeVisible();
    });

    test('Modern HUB User Search Flow', async ({ userAdminPage }) => {
        await userAdminPage.goto();

        // Perform search
        await userAdminPage.search('관리자');

        // Verify results - looking for the text in the list
        await expect(userAdminPage.page.getByText('관리자').first()).toBeVisible({ timeout: 15000 });
    });
});
