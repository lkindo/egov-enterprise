import { test, expect } from '@playwright/test';

test.describe('Community Module', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/cop/cmy/selectCommunityList');
    });

    test('should display community list', async ({ page }) => {
        await expect(page.getByText('커뮤니티 관리')).toBeVisible();
    });
});
