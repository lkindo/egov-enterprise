import { test, expect } from '@playwright/test';

test.describe('Schedule Module', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/cop/smt/sim/selectScheduleList');
    });

    test('should display schedule list', async ({ page }) => {
        await expect(page.getByText('일정 관리')).toBeVisible();
        await page.getByPlaceholder('일정명 입력').fill('test');
        await expect(page.getByPlaceholder('일정명 입력')).toBeVisible();
    });

    test('should navigate to registration page', async ({ page }) => {
        await page.getByRole('button', { name: '일정 등록' }).click();
        await expect(page).toHaveURL(/\/cop\/smt\/sim\/insertSchedule\/?/);
        await expect(page.getByText('새 일정 등록')).toBeVisible();
    });
});
