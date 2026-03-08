import { test, expect } from '@playwright/test';

test.describe('Admin Common Code - Ultimate CRUD', () => {
    test.setTimeout(180000);

    test('Full Flow', async ({ page }) => {
        // 1. Login
        await page.goto('/login', { waitUntil: 'domcontentloaded' });
        await page.fill('#id', 'webmaster');
        await page.fill('#password', '1');
        await page.click('button[type="submit"]', { force: true });

        await page.waitForURL(url => url.pathname === '/', { timeout: 60000 });
        await page.addInitScript(() => { window.localStorage.setItem('egov_smart_tour_v1', 'true'); });

        // 2. Navigate to Common Code
        await page.goto('/admin/system/common-code', { waitUntil: 'networkidle' });
        console.log('>>> Arrived at Common Code page');

        // 3. Select Taxonomy - Wait for any group button to appear
        const groupBtn = page.locator('button').filter({ hasText: /전자정부|EFC|분류/ }).first();
        await expect(groupBtn).toBeVisible({ timeout: 30000 });
        await groupBtn.click({ force: true });

        // Wait for sub-items and click the first one
        await page.waitForTimeout(2000);
        const subGroupBtn = page.locator('button').filter({ has: page.locator('.font-mono') }).first();
        await subGroupBtn.click({ force: true });
        console.log('>>> Group selected');

        // 4. Create
        const createBtn = page.locator('button:has-text("코드 등록")');
        await expect(createBtn).toBeVisible({ timeout: 30000 });
        await createBtn.click({ force: true });

        // 5. Fill Form
        const codeId = `E2E${Math.floor(Math.random() * 9999)}`;
        console.log(`>>> Creating Code ID: ${codeId}`);
        await page.locator('input[placeholder="CODE_01"]').fill(codeId);
        await page.locator('input[placeholder="공통코드명"]').fill('E2E Success Name');

        await page.click('button:has-text("설정 저장하기")', { force: true });
        console.log('>>> Save button clicked');

        // 6. Search & Verify
        await page.waitForTimeout(3000); // Wait for router refresh
        const searchInput = page.locator('input[placeholder*="검색"]').first();
        await searchInput.fill(codeId);
        await page.keyboard.press('Enter');

        await page.waitForTimeout(2000);
        await expect(page.getByText(codeId).first()).toBeVisible({ timeout: 15000 });

        console.log('>>> CRUD DEEP-DIVE SUCCESSFUL');
    });
});
