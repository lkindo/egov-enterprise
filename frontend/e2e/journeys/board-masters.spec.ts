import { expect,test } from '../fixtures/browser-test';
import { BoardMasterPage } from '../pages/BoardMasterPage';
test.describe('Board Master Management (Admin Flow)', () => {
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
        page.on('dialog', async (dialog) => {
            console.log(`>>> Dialog detected: [${dialog.message()}] - Auto-accepting.`);
            await dialog.accept();
        });
    });
    test("게시판 만들기(사용 안 함·메뉴 비활성) → 운영 화면 설정 저장 → 목록에서 사용 안 함으로 바꾸기", async ({ page }) => {
        // [2026-10-23 ADR-0040 §5.2·5.3·5.5] 설정 편집은 운영 화면 설정 탭으로, 단건 비활성화는 목록의 일괄 사용 상태 바꾸기로 옮겼다.
        const uniqueId = Date.now();
        const boardName = `E2E_Console_Test_${uniqueId}`;
        const boardDesc = `Automated test board created via E2E wizard at ${new Date().toISOString()}`;
        const updatedName = `${boardName}_UPDATED`;
        const updatedDesc = `Updated description via E2E test`;
        console.log('>>> [PRE-REQ] Creating a temporary board via Wizard');
        await boardMasterPage.gotoMaster();
        await boardMasterPage.startWizard();
        await boardMasterPage.fillStep1(boardName, boardDesc);
        await boardMasterPage.fillStep2('지식 허브');
        await boardMasterPage.fillStep3(`Menu_${boardName}`);
        await boardMasterPage.fillStep4();
        await boardMasterPage.verifySuccess(`Menu_${boardName}`);
        console.log('\n>>> Step 1: Continuing to the operations screen (publication readiness)');
        await boardMasterPage.continuePublicationReadiness();
        console.log('\n>>> Step 2: Saving settings on the operations screen');
        await boardMasterPage.updateSettingsOnOperations({
            name: updatedName,
            description: updatedDesc,
            useYn: 'Y'
        });
        console.log('\n>>> Step 3: Verifying the update in the list');
        await boardMasterPage.gotoMaster();
        await boardMasterPage.search(updatedName);
        const row = page.locator('tr').filter({ hasText: updatedName }).first();
        await expect(row).toBeVisible({ timeout: 15000 });
        await expect(row.getByText('사용', { exact: true })).toBeVisible({ timeout: 15000 });
        console.log('\n>>> Step 4: Switching the board to unused from the list');
        await boardMasterPage.deactivateFromList(updatedName);
        await expect(row.getByText('사용 안 함', { exact: true })).toBeVisible({ timeout: 15000 });
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
            // 색상 구현 클래스가 아니라 사용자가 실제로 받는 Zod 검증 문구를 단언한다.
            const boardNameInput = page.getByRole('textbox', { name: '게시판 명칭', exact: true });
            await expect(page.locator('#bbsTtl-error'))
                .toHaveText('게시판 명칭을 2자 이상 입력해 주세요.', { timeout: 15000 });
            await expect(boardNameInput).toHaveAttribute('aria-invalid', 'true');
            await expect(boardNameInput).toBeFocused();
        }
        else {
            // [E2E 감사 B] else 무단언 제거 — 빈 이름일 때 다음 버튼이 실제로 비활성인지 단언한다.
            await expect(nextBtn).toBeDisabled();
            console.log('>>> Next button correctly disabled for empty name');
        }
    });
});
