import { test, expect, type BrowserContext } from '@playwright/test';
import path from 'path';

test.describe('Board Integration Workflow', () => {
    let adminContext: BrowserContext;

    test.beforeAll(async ({ browser }) => {
        adminContext = await browser.newContext({
            storageState: path.resolve(__dirname, '../playwright/.auth/admin.json'),
        });
    });

    test.afterAll(async () => {
        await adminContext.close();
    });

    test('Full workflow: Create post -> Verify -> Delete', async () => {
        const page = await adminContext.newPage();

        await page.goto('/admin/community/boards');
        await expect(page.getByText('통합 게시판')).toBeVisible({ timeout: 20000 });

        const testSubject = `Workflow Test - ${Date.now()}`;
        
        const writeBtn = page.getByRole('button', { name: /새 글 쓰기|등록/i });
        await expect(writeBtn).toBeVisible({ timeout: 15000 });
        await writeBtn.click();
        
        await expect(page).toHaveURL(/.*\/write/);
        await page.getByPlaceholder(/제목/i).fill(testSubject);
        await page.locator('textarea').fill('System integration test content.');
        
        // 저장 - force click을 사용하여 가려진 경우에도 클릭 시도
        const saveBtn = page.getByRole('button', { name: /저장|등록|확인/i }).first();
        await saveBtn.click({ force: true });
        
        // 목록에서 찾기 위해 검색 필터 사용
        await page.goto('/admin/community/boards');
        const searchInput = page.getByPlaceholder(/제목, 내용 입력/i);
        await searchInput.fill(testSubject);
        await searchInput.press('Enter');

        // 검색 결과 대기
        await expect(page.locator('tr', { hasText: testSubject })).toBeVisible({ timeout: 30000 });
        console.log('>>> Post found via search.');

        // 3. 삭제 및 정리
        const postRow = page.locator('tr', { hasText: testSubject });
        await postRow.click();
        
        const deleteBtn = page.getByRole('button', { name: /삭제/i });
        await expect(deleteBtn).toBeVisible({ timeout: 10000 });
        
        page.once('dialog', dialog => dialog.accept());
        await deleteBtn.click({ force: true });
        
        await expect(page.getByText(testSubject)).not.toBeVisible({ timeout: 15000 });
        console.log('>>> Workflow completed and cleaned up.');
    });
});
