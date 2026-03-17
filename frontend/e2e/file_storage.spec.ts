import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test.describe('File Storage & Security Validation', () => {
    const testFilePath = path.resolve(__dirname, 'test-assets/sample.txt');
    const forbiddenFilePath = path.resolve(__dirname, 'test-assets/danger.exe');

    test.beforeAll(async () => {
        const assetDir = path.resolve(__dirname, 'test-assets');
        if (!fs.existsSync(assetDir)) fs.mkdirSync(assetDir);
        fs.writeFileSync(testFilePath, 'This is a test file content.');
        fs.writeFileSync(forbiddenFilePath, 'fake executable content');
    });

    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => { window.localStorage.setItem('egov_smart_tour_v1', 'true'); });
        await page.goto('/admin/community/boards');
        await expect(page.getByText('통합 게시판')).toBeVisible({ timeout: 30000 });
    });

    test('should upload a valid file successfully', async ({ page }) => {
        const writeBtn = page.getByRole('button', { name: '새 글 쓰기' });
        await writeBtn.click();
        await expect(page).toHaveURL(/.*\/write/);

        const fileInput = page.locator('input[type="file"]').first();
        if (await fileInput.count() > 0) {
            await fileInput.setInputFiles(testFilePath);
            await expect(page.getByText('sample.txt')).toBeVisible();
            
            const testSubject = `File Test - ${Date.now()}`;
            await page.getByPlaceholder(/제목/i).fill(testSubject);
            
            const saveBtn = page.getByRole('button', { name: /저장|등록/i }).first();
            await saveBtn.click({ force: true });
            
            // 검색 필터를 사용하여 작성된 글 찾기
            await page.goto('/admin/community/boards');
            const searchInput = page.getByPlaceholder(/제목, 내용 입력/i);
            await searchInput.fill(testSubject);
            await searchInput.press('Enter');

            await expect(page.locator('tr', { hasText: testSubject })).toBeVisible({ timeout: 30000 });
            console.log('>>> SUCCESS: Valid file uploaded and verified via search.');
        } else {
            console.log('>>> SKIP: No file input on write page.');
            test.skip();
        }
    });

    test('should block forbidden file extensions', async ({ page }) => {
        const writeBtn = page.getByRole('button', { name: '새 글 쓰기' });
        await writeBtn.click();

        const fileInput = page.locator('input[type="file"]').first();
        if (await fileInput.count() > 0) {
            await fileInput.setInputFiles(forbiddenFilePath);
            
            const errorMsg = page.locator('text=/허용되지 않는|금지된|Invalid|Forbidden/i');
            if (!await errorMsg.isVisible()) {
                const saveBtn = page.getByRole('button', { name: /저장|등록/i }).first();
                await saveBtn.click({ force: true });
            }
            await expect(errorMsg.first()).toBeVisible({ timeout: 10000 });
            console.log('>>> SUCCESS: Forbidden file extension blocked.');
        } else {
            test.skip();
        }
    });
});
