import { test, expect } from '@playwright/test';

test.describe('Address Book Module', () => {
    test.beforeEach(async ({ page }) => {
        // Assuming we can visit without logging in or permitAll is set
        await page.goto('/cop/adb/selectAddressBookList');
    });

    test('should display address book list and allow search', async ({ page }) => {
        await expect(page.getByText('주소록 관리')).toBeVisible();

        const searchInput = page.getByPlaceholder('검색어 입력');
        await expect(searchInput).toBeVisible();
        await searchInput.fill('홍길동');
        await page.getByRole('button', { name: '검색하기' }).click();

        // Validation depends on data, but ensuring no error occurs is a good start
        await expect(page.getByText('주소록 관리')).toBeVisible();
    });

    test('should navigate to registration page', async ({ page }) => {
        await page.getByRole('button', { name: '주소록 등록' }).click();
        await expect(page).toHaveURL(/\/cop\/adb\/insertAddressBook\/?/);
        await expect(page.getByText('새 주소록 등록')).toBeVisible();
    });
});