import { test, expect } from './fixtures/base-test';
import { BoardMasterPage } from './pages/BoardMasterPage';

test.describe('Tier 3: Board Master Management (Admin Flow)', () => {
    // Inject Admin Session
    test.use({ storageState: 'playwright/.auth/admin.json' });

    let boardMasterPage: BoardMasterPage;

    test.beforeEach(async ({ page }) => {
        // [2026-08-10 제거] `test.setTimeout(300000)` — playwright.config 가 2026-07-28 에 전역
        //   timeout 을 300s → 180s 로 내린 근거(실측 최장 테스트 50.2s · CI 는 retries 가 곱해져
        //   한 테스트의 상한이 timeout×(1+retries) 가 된다)를 **이 파일만 되돌리고 있었다**.
        //   180s 도 실측 최장의 3.6배라 여유는 충분하다. 유독 이 스펙만 5분이 필요하다는 근거는 없었다.
        boardMasterPage = new BoardMasterPage(page);
        // [E2E 감사 C5] 수동 ConsoleErrorGuard 이중 설치 제거 — base-test의 auto consoleGuard가 전역 적용됨.

        // Handle ANY dialog early
        page.on('dialog', async dialog => {
            console.log(`>>> Dialog detected: [${dialog.message()}] - Auto-accepting.`);
            await dialog.accept();
        });
    });

    test('Full Board Master Lifecycle: Create -> Update -> Delete', async ({ page }) => {
        const uniqueId = Date.now();
        const boardName = `E2E_Console_Test_${uniqueId}`;
        const boardDesc = `Automated test board created via E2E wizard at ${new Date().toISOString()}`;
        const updatedName = `${boardName}_UPDATED`;
        const updatedDesc = `Updated description via E2E test`;

        console.log('>>> [PRE-REQ] Creating a temporary board via Wizard');
        await boardMasterPage.gotoMaster();
        await boardMasterPage.startWizard();
        
        await boardMasterPage.fillStep1(boardName, boardDesc);
        await boardMasterPage.fillStep2();
        await boardMasterPage.fillStep3();
        await boardMasterPage.fillStep4(`Menu_${boardName}`);
        await boardMasterPage.verifySuccess(`Menu_${boardName}`);

        console.log('\n>>> Step 1: Navigating to Board Master Console');
        await boardMasterPage.gotoMaster();
        await expect(page).toHaveURL(/.*master/);

        console.log(`\n>>> Step 2: Searching for test board: ${boardName}`);
        await boardMasterPage.search(boardName);
        await expect(page.locator('tr').filter({ hasText: boardName }).first()).toBeVisible({ timeout: 15000 });

        console.log('\n>>> Step 3: Opening Settings Modal and Updating Information');
        await boardMasterPage.openSettings(boardName);
        await boardMasterPage.updateSettings({
            name: updatedName,
            description: updatedDesc,
            useYn: 'Y'
        });

        console.log('\n>>> Step 4: Verifying Update in List');
        await boardMasterPage.search(updatedName);
        await expect(boardMasterPage.page.locator('tr').filter({ hasText: updatedName }).first()).toBeVisible({ timeout: 15000 });
        
        console.log('\n>>> Step 5: Deleting the Board Master Permanently');
        await boardMasterPage.deleteBoard(updatedName);

        console.log('\n>>> Step 6: Verifying Deletion');
        await boardMasterPage.search(updatedName);
        
        // Soft delete sets use_yn='N' (rendered as "대기" in Korean UI) rather than hard deleting the row
        const row = page.locator('tr').filter({ hasText: updatedName }).first();
        await expect(row).toContainText('대기', { timeout: 15000 });
    });

    test('Validation Edge Case: Creation Failure with Empty Name', async ({ page }) => {
        console.log('>>> Navigating to Maker to test validation failure');
        await boardMasterPage.gotoMaker();
        
        // Fill description but leave name empty
        await boardMasterPage.bbsIntrcnInput.fill('This should fail due to empty name');
        
        // Attempt to click Next - should be disabled or show error
        const nextBtn = boardMasterPage.nextButton;
        const isNextDisabled = await nextBtn.isDisabled();
        
        if (!isNextDisabled) {
            await nextBtn.click();
            // Expect validation message or toast (Zod message: 게시판 명칭은 최소 2글자 이상이어야 합니다)
            await expect(page.locator('.text-red-500').filter({ hasText: '최소 2글자' }).first()).toBeVisible({ timeout: 15000 });
        } else {
            // [E2E 감사 B] else 무단언 제거 — 빈 이름일 때 다음 버튼이 실제로 비활성인지 단언한다.
            await expect(nextBtn).toBeDisabled();
            console.log('>>> Next button correctly disabled for empty name');
        }
    });
});

// [2026-08-10 이관] 삭제됨: 'Tier 3: Board Master Security (Unauthorized Access)' describe.
//
//   `/admin/community/boards/master` 의 비관리자 차단은 미들웨어 §4 의 ADMIN_ONLY_SUBPATHS carve-out 이며,
//   23-security-auth-supplement 의 E4 매트릭스가 carve-out 3건 전량(master·maker·templates)을 소유한다.
//   종전 구현은 그 위에 결함이 세 겹이었다:
//     ① 최상위가 if/else 인데 **두 갈래 모두 통과 경로**였다 — 차단되든 리다이렉트되든 그린.
//     ② else 분기의 `expect(url).not.toContain('admin')` 은 리다이렉트 목적지가 `/?auth_error=...` 라
//        우연히 성립하던 단언이지, 차단을 증명하지 않았다.
//     ③ `if (await wizardBtn.count() > 0)` 가드 안의 단언은 버튼이 없으면 **아무것도 검사하지 않았다**.
//   즉 이 테스트는 "관리자 전용 화면이 일반 사용자에게 열려도" red 가 될 수 있는 구조가 아니었다.
//   E4 는 리다이렉트 Location 을 직접 단언하므로 그 구멍이 없다.
