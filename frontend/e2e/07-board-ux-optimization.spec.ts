import { test, expect } from './fixtures/base-test';

test.use({ storageState: 'playwright/.auth/admin.json' });

test.describe('Board UX Optimization E2E Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to board list
    await page.goto('/admin/community/boards/selectBoardList?bbsId=BBSMSTR_AAAAAAAAAAAA');
    await page.waitForLoadState('networkidle');
  });

  test('Search and Sort Persistence (Task 1 & 2)', async ({ page }) => {
    console.log('>>> Testing Search and Sort Persistence');
    
    const searchInput = page.getByTestId('board-search-input');
    await searchInput.fill('E2E Test');
    await page.getByRole('button', { name: /조회/ }).click();

    // Verify searchWrd in URL (Allow both + and %20 for space)
    await expect(page).toHaveURL(/searchWrd=E2E[+%]Test/);

    // Change sorting
    await page.getByTestId('board-sort-select').click();
    await page.getByRole('option', { name: '조회수순' }).click();

    // Verify both searchWrd and orderBy in URL (Persistence)
    await expect(page).toHaveURL(/searchWrd=E2E[+%]Test/);
    await expect(page).toHaveURL(/orderBy=views/);
    
    console.log('>>> Search and Sort persistence verified');
  });

  test('Optimistic Update - Like Action (Task 6)', async ({ page }) => {
    console.log('>>> Testing Optimistic Like Update');
    
    // Ensure data is loaded
    await page.waitForSelector('[data-testid="like-button"]');
    
    // Find the first like button and get current count
    const firstLikeButton = page.getByTestId('like-button').first();
    const countElement = firstLikeButton.locator('[data-testid="like-count"]');
    
    const initialCountText = await countElement.innerText();
    const initialCount = parseInt(initialCountText.replace(/[^0-9]/g, '')) || 0;

    // Click like
    await firstLikeButton.click();

    // Check if count increased immediately (Optimistic)
    const newCountText = await countElement.innerText();
    const newCount = parseInt(newCountText.replace(/[^0-9]/g, '')) || 0;
    
    console.log(`>>> Like count: ${initialCount} -> ${newCount}`);
    expect(newCount).toBe(initialCount + 1);
  });

  test('Auto-save and Restoration (Task 8)', async ({ page }) => {
    console.log('>>> Testing Auto-save and Restoration');
    
    await page.goto('/admin/community/boards/insertBoardArticle?bbsId=BBSMSTR_AAAAAAAAAAAA');
    
    const titleInput = page.getByTestId('article-title-input');
    const editorWrapper = page.getByTestId('rich-text-editor');
    
    const testTitle = `E2E AutoSave Title ${Date.now()}`;
    const testContent = `E2E AutoSave Content ${Date.now()}`;

    // Fill title
    await titleInput.fill(testTitle);
    
    // Fill content (Wait for Tiptap editor to be ready)
    // Tiptap uses .ProseMirror class for its editable area
    const editor = editorWrapper.locator('.ProseMirror');
    await editor.waitFor({ state: 'visible' });
    await editor.fill(testContent);

    // Give it a moment to trigger auto-save (we wait a bit more than debounce)
    await page.waitForTimeout(2000);

    // Setup dialog handler before reload
    page.once('dialog', async dialog => {
      console.log(`>>> Dialog detected: ${dialog.message()}`);
      expect(dialog.message()).toContain('임시저장');
      await dialog.accept();
    });

    // Reload to trigger restoration logic
    await page.reload();

    // Verify title is restored
    await expect(titleInput).toHaveValue(testTitle);
    
    console.log('>>> Auto-save restoration verified');
  });
});
