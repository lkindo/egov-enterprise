import { test, expect } from '@playwright/test';

test.describe('Board Master Maker Wizard', () => {
  test.use({ storageState: 'playwright/.auth/admin.json' });

  test('should create a new board and link it to menu successfully', async ({ page }) => {
    // 1. Navigate to Board Master List
    await page.goto('/admin/community/boards/master');
    
    // Check if we are on the right page
    await expect(page.locator('h1:has-text("Master Console")')).toBeVisible();

    // 2. Click "게시판 생성 마법사"
    await page.getByRole('button', { name: '게시판 생성 마법사' }).click();
    await expect(page).toHaveURL(/.*\/maker/);

    // --- STEP 1: Basic Config ---
    const boardName = `E2E_WIZARD_${Date.now()}`;
    await page.locator('input[name="bbsNm"]').fill(boardName);
    await page.locator('textarea[name="bbsIntrcn"]').fill(`E2E Test Description for ${boardName}`);
    
    // Click "다음 단계로"
    await page.getByRole('button', { name: '다음 단계로' }).click();

    // --- STEP 2: Template Selection ---
    // Wait for step 2 content
    await expect(page.locator('text=용도에 맞는 UI 스타일을 선택하세요.')).toBeVisible();
    await page.click('text=Enterprise List');
    await page.getByRole('button', { name: '다음 단계로' }).click();

    // --- STEP 3: Permission Matrix ---
    await expect(page.locator('text=사용자 그룹별 권한을 설정하세요.')).toBeVisible();
    await page.getByRole('button', { name: '다음 단계로' }).click();

    // --- STEP 4: Menu Deployment ---
    await expect(page.locator('text=사이트 메뉴에 게시판을 연결하세요.')).toBeVisible();
    // menuNm should be auto-filled from bbsNm by now
    const menuNmValue = await page.inputValue('input[name="menuNm"]');
    console.log(`Menu Name pre-filled as: ${menuNmValue}`);
    
    // Click '게시판 생성 및 메뉴 배포'
    await page.getByRole('button', { name: '게시판 생성 및 메뉴 배포' }).click();

    // Verify SUCCESS page
    await expect(page.locator('text=MISSION COMPLETE!')).toBeVisible({ timeout: 30000 });
    
    // 3. Verify in List
    await page.getByRole('button', { name: '게시판 목록 보기' }).click();
    await expect(page).toHaveURL(/.*\/master/);
    
    // Search
    await page.locator('input[placeholder*="검색"]').fill(boardName);
    await page.keyboard.press('Enter');
    
    await expect(page.locator(`text=${boardName}`)).toBeVisible({ timeout: 15000 });
  });
});
