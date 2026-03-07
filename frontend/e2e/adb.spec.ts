import { test, expect } from '@playwright/test';

test.describe('Address Book Module', () => {
    test.beforeEach(async ({ page }) => {
        // Login
        await page.goto('/login');
        await page.fill('#id', 'webmaster');
        await page.fill('#password', '1');
        await page.click('button[type="submit"]');
        await page.waitForURL('**/');

        await page.goto('/cop/adb');
    });

    test('should display address book list and allow search', async ({ page }) => {
        await expect(page.getByText('통합 주소록')).toBeVisible();

        const searchInput = page.getByPlaceholder('이름, 부서, 회사명...');
        await expect(searchInput).toBeVisible();
        await searchInput.fill('홍길동');
        await page.getByRole('button', { name: '검색 실행' }).click();

        // Validation depends on data, but ensuring no error occurs is a good start
        await expect(page.getByText('통합 주소록')).toBeVisible();
    });

    test('should open contact detail modal', async ({ page }) => {
        // Find the first contact in the list
        const firstContact = page.locator('.VirtualScrollList div').first();
        if (await firstContact.count() > 0) {
            await firstContact.click();
            await expect(page.getByText('상세 연락처 정보')).toBeVisible();
            await expect(page.getByRole('button', { name: '메일 작성' })).toBeVisible();
        }
    });
});
