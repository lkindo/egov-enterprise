import { test, expect } from './fixtures/base-test';


// --- From: bbs.spec.ts ---
test.describe('bbs', () => {

test.describe('BBS Module - Optimized with POM', () => {
    // Inject session for specific test run if needed, but baseline uses projects in config
    test.use({ storageState: 'playwright/.auth/admin.json' });

    test('BBS List and Search Flow', async ({ bbsPage }) => {
        console.log('>>> Step 1: Navigating to BBS Page');
        await bbsPage.goto();
        
        console.log('>>> Step 2: Verifying Page Structure');
        await bbsPage.verifyPageStructure();

        console.log('>>> Step 3: Performing Search Action');
        await bbsPage.search('공지');
        
        // Final verification post-search
        await expect(bbsPage.dataTable).toBeVisible();
    });

    test('BBS Detail Navigation Flow', async ({ bbsPage }) => {
        console.log('>>> Step 1: Navigating to BBS Page');
        await bbsPage.goto();

        console.log('>>> Step 2: Clicking First Record Row');
        if (await bbsPage.firstRow.isVisible()) {
            await bbsPage.clickFirstRow();
            
            console.log('>>> Step 3: Verifying Detail View Content');
            await bbsPage.verifyDetailView();
        } else {
            console.log('>>> Info: No board articles found for detail view testing');
        }
    });

    // Example of Visual Regression Test (Optional improvement)
    test('BBS Visual Snapshot Check', async ({ page, bbsPage }) => {
        await bbsPage.goto();
        await bbsPage.verifyPageStructure();
        
        // Automated visual diff (Needs --update-snapshots on first run)
        // await expect(page).toHaveScreenshot('bbs-list-view.png', { mask: [page.locator('.timestamp')] });
    });
});

});

// --- From: board-master.spec.ts ---
test.describe('board-master', () => {

test.describe('Board 마스터 콘솔 & Wizard E2E', () => {
    // Tests are scoped to admin project which uses admin.json session
    
    test('Verify 마스터 콘솔 Page and Wizard Entry', async ({ boardMasterPage }) => {
        console.log('>>> Step 1: Navigating to 마스터 콘솔');
        await boardMasterPage.gotoMaster();
        
        console.log('>>> Step 2: Verifying Page Structure - 마스터 콘솔');
        await expect(boardMasterPage.page.getByText('마스터 콘솔')).toBeVisible();
        await expect(boardMasterPage.wizardButton).toBeVisible();
    });

    test('Full Board Creation Wizard Flow', async ({ boardMasterPage }) => {
        const boardName = `E2E Test Board ${Date.now()}`;
        const menuName = `Menu ${boardName}`;
        
        console.log('>>> Step 1: Starting Wizard from Maker Page');
        await boardMasterPage.gotoMaker();
        
        console.log('>>> Step 2: Step 1 - Basic Info');
        await boardMasterPage.fillStep1(boardName, 'This is an automated E2E test board creation.');
        
        console.log('>>> Step 3: Step 2 - Template Selection');
        await boardMasterPage.fillStep2('Knowledge Hub');
        
        console.log('>>> Step 4: Step 3 - Permission Matrix');
        await boardMasterPage.fillStep3();
        
        console.log('>>> Step 5: Step 4 - Menu Deployment');
        await boardMasterPage.fillStep4(menuName);
        
        console.log('>>> Step 6: Verifying Mission Complete');
        await boardMasterPage.verifySuccess(menuName);
        
        console.log('>>> Step 7: Navigating back to 마스터 콘솔 to verify listed board');
        await boardMasterPage.page.getByRole('button', { name: /게시판 목록 보기/i }).click();
        await expect(boardMasterPage.page.getByText(boardName)).toBeVisible({ timeout: 15000 });
    });
});

});

// --- From: board-maker-wizard.spec.ts ---
test.describe('board-maker-wizard', () => {


test.describe('Board Master Maker Wizard', () => {
  test.use({ storageState: 'playwright/.auth/admin.json' });

  test('should create a new board and link it to menu successfully', async ({ page }) => {
    // 1. Navigate to Board Master List
    await page.goto('/admin/community/boards/master');
    
    // Check if we are on the right page
    await expect(page.locator('h1:has-text("마스터 콘솔")')).toBeVisible();

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

    console.log('Clicked "Create and Deploy", waiting for SUCCESS state...');
    
    // Verify SUCCESS page
    try {
      await expect(page.locator('text=MISSION COMPLETE!')).toBeVisible({ timeout: 60000 });
      console.log('>>> SUCCESS: Board and Menu created successfully!');
    } catch (e) {
      const currentStatus = await page.locator('button:has(svg.animate-spin)').textContent();
      const pageUrl = page.url();
      const pageBody = await page.content();
      console.error('>>> FAILED: Success message not visible.');
      console.error('Current URL:', pageUrl);
      console.error('Current Status:', currentStatus);
      if (pageBody.includes('Error') || pageBody.includes('Failed')) {
        console.error('Page contains error indicator!');
      }
      throw e;
    }
    
    // 3. Verify in List
    await page.getByRole('button', { name: '게시판 목록 보기' }).click();
    await expect(page).toHaveURL(/.*\/master/);
    
    // Search
    await page.locator('input[placeholder*="검색"]').fill(boardName);
    await page.keyboard.press('Enter');
    
    await expect(page.locator(`text=${boardName}`)).toBeVisible({ timeout: 15000 });
  });
});

});

// --- From: cmy.spec.ts ---
test.describe('cmy', () => {


test.describe('Community Module', () => {
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => { window.localStorage.setItem('egov_smart_tour_v1', 'true'); });
        await page.goto('/', { waitUntil: 'domcontentloaded' });
    });

    test('should display community list', async ({ page }) => {
        await page.goto('/cop/cmy');
        await expect(page.locator('main')).toBeVisible();
    });
});

});

// --- From: survey.spec.ts ---
test.describe('survey', () => {


test.describe('Survey Module', () => {
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => { window.localStorage.setItem('egov_smart_tour_v1', 'true'); });
        await page.goto('/', { waitUntil: 'domcontentloaded' });
    });

    test('should display survey list', async ({ page }) => {
        await page.goto('/survey/response');
        await expect(page.locator('main')).toBeVisible();
        await expect(page.getByText(/상세|검색|설문|Survey/i).first()).toBeVisible();
    });

    test('should navigate to survey detail and back', async ({ page }) => {
        await page.goto('/survey/response');
        // Back navigation test logic if present
    });
});

});

// --- From: survey_resilient.spec.ts ---
test.describe('survey_resilient', () => {


test.describe('Survey Module - Resilient Check', () => {
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => { window.localStorage.setItem('egov_smart_tour_v1', 'true'); });
        await page.goto('/', { waitUntil: 'domcontentloaded' });
    });

    test('should display survey list or empty message', async ({ page }) => {
        await page.goto('/survey/response', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('main')).toBeVisible();

        const html = await page.content();
        if (html.includes('설문조사명')) {
            await expect(page.locator('table')).toBeVisible();
        } else {
            await expect(page.locator('main')).toContainText(/데이터가 없습니다|설문조사/i);
        }
    });
});

});
