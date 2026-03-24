import { test, expect } from '@playwright/test';

/**
 * Workspace Flow E2E Test
 * 1. Login
 * 2. Navigate to Board (BBS)
 * 3. Create a New Post
 * 4. Verify Post Creation
 * 5. Delete the Post (Clean up)
 */
test.describe('Workspace Flow', () => {
    test.use({ storageState: 'playwright/.auth/user.json' });

    test('Full CRUD Flow on BBS', async ({ page }) => {
        const bbsId = 'BBSMSTR_AAAAAAAAAAAA'; // Default BBS
        const title = `E2E Test Post - ${Date.now()}`;
        const content = 'This is an automated test content.';

        console.log('>>> Step 1: Navigate to BBS List');
        await page.goto(`/cop/bbs?bbsId=${bbsId}`, { waitUntil: 'domcontentloaded' });
        await expect(page.locator('main')).toBeVisible();

        console.log('>>> Step 2: Click Create Button');
        // Find create button by text or icon
        const createBtn = page.getByRole('button', { name: /등록|작성|Create/i }).first();
        await createBtn.click({ force: true });

        console.log('>>> Step 3: Fill Post Form');
        await page.fill('input[name="nttSj"], input[placeholder*="제목"]', title);
        
        // Handle Rich Editor (ProseMirror or textarea)
        const editor = page.locator('.ProseMirror, textarea[name="nttCn"]').first();
        if (await editor.isVisible()) {
            await editor.click();
            await page.keyboard.type(content);
        }

        console.log('>>> Step 4: Submit Form');
        await page.click('button[type="submit"]:has-text("등록"), button:has-text("저장"), button:has-text("Publish")', { force: true });

        console.log('>>> Step 5: Verify Post in List');
        await page.goto(`/cop/bbs?bbsId=${bbsId}`, { waitUntil: 'domcontentloaded' });
        await expect(page.getByText(title)).toBeVisible({ timeout: 20000 });

        console.log('>>> Step 6: Delete Post');
        await page.getByText(title).click();
        const deleteBtn = page.getByRole('button', { name: /삭제|Delete/i }).first();
        
        // Handle confirm dialog if any
        page.on('dialog', dialog => dialog.accept());
        await deleteBtn.click({ force: true });

        console.log('>>> Step 7: Verify Deletion');
        await expect(page.getByText(title)).not.toBeVisible();
    });
});
