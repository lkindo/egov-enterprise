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
    // [2026-10-23 ADR-0040 §5.4 B1] 예약 게시판의 예약 글을 운영 화면에서 찾아 일정 바꾸기로 공개하고, 종료일을 한꺼번에 바꾸면
    //   변경 이력에 게시 기간이 남는다. 날짜는 앱과 같은 Asia/Seoul 로 만든다 — 러너는 UTC 다.
    // [B2] 관리자에게는 상단 고정 권한(BOARD_PIN)이 기본 배정되지 않는다(결정 5) — 고정을 받는 게시판이어도 고정 단추가 없고
    //   고정 API 는 403 이다. 고정 성공 경로(상한·만료)는 단위·백엔드 통합 시험이 맡는다(R-11).
    test('운영 화면 게시물 탭 — 예약 글 조회·일정 바꾸기로 공개·종료일 일괄 바꾸기·상단 고정 기본 상태', async ({ page, adminRequest }) => {
        const kstYmd = (offsetDays: number) => new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
        }).format(new Date(Date.now() + offsetDays * 86_400_000));
        const today = kstYmd(0);
        const nextWeek = kstYmd(7);
        const nextMonth = kstYmd(30);
        const uniqueId = Date.now();
        const boardName = `E2E_예약게시판_${uniqueId}`;
        const scheduledTitle = `E2E 예약 글 ${uniqueId}`;
        const postingTitle = `E2E 게시 중 글 ${uniqueId}`;

        const createdBoard = await adminRequest.post('/api/v1/admin/system/board-masters', {
            data: {
                bbsTtl: boardName, bbsExpln: 'B1 예약 게시 E2E', bbsTypeCd: 'BBST02', bbsAtrbCd: 'BBSA01', tmpltId: 'TMPLT_LIST',
                fileAtchPsbltyYn: 'Y', atchPsbltyFileQty: 3, atchPsbltyFileSz: 0, useYn: 'Y', rsvtPstgPsbltyYn: 'Y',
                upendFixPsbltyYn: 'Y', upendFixUplmtNocs: 5, upendFixBscDayCnt: 30,
            },
        });
        expect(createdBoard.status()).toBe(201);
        const bbsId = (await createdBoard.json()).data as string;
        const pstSns: number[] = [];
        try {
            for (const [title, start] of [[scheduledTitle, nextWeek.replace(/-/g, '')], [postingTitle, undefined]] as const) {
                const created = await adminRequest.post('/api/v1/boards/posts', {
                    data: { bbsId, pstTtl: title, pstCn: '<p>B1 운영 화면 E2E</p>', ...(start ? { pstBgngYmd: start } : {}) },
                });
                expect(created.status()).toBe(201);
                pstSns.push((await created.json()).data as number);
            }

            await boardMasterPage.openPostsTab(bbsId);
            const rowOf = (title: string) => page.getByRole('row', { name: new RegExp(title) });
            await expect(rowOf(scheduledTitle).getByText('예약', { exact: true })).toBeVisible({ timeout: 15000 });
            await expect(rowOf(postingTitle).getByText('게시 중', { exact: true })).toBeVisible();

            // 게시 상태 조건은 조회로 적용하고 서버가 거른다 — 예약 글만 남는다.
            await boardMasterPage.filterPostsByStatus('예약', 'postingStatus=SCHEDULED');
            await expect(rowOf(scheduledTitle)).toBeVisible({ timeout: 15000 });
            await expect(rowOf(postingTitle)).toHaveCount(0, { timeout: 15000 });
            // 앞서 받은 '전체' 로 돌아가면 캐시가 그릴 수 있다 — 응답 대신 행으로 확인한다.
            await boardMasterPage.filterPostsByStatus('전체');
            await expect(rowOf(postingTitle)).toBeVisible({ timeout: 15000 });

            // [B2] 고정을 받는 게시판이라 상한·기본 일수를 보이지만, 관리자에게 상단 고정 권한이 없어 고정 단추는 없다.
            await expect(page.getByText('고정 상한 5건 · 기본 30일')).toBeVisible();
            await expect(page.getByRole('button', { name: `${postingTitle} 상단 고정 바꾸기` })).toHaveCount(0);
            await page.getByRole('checkbox', { name: `${postingTitle} 선택` }).check();
            await expect(page.getByRole('button', { name: /^종료일 바꾸기$/ })).toBeVisible();
            await expect(page.getByRole('button', { name: /^상단 고정하기$/ })).toHaveCount(0);
            await expect(page.getByRole('button', { name: /^고정 해제하기$/ })).toHaveCount(0);
            await page.getByRole('checkbox', { name: `${postingTitle} 선택` }).uncheck();
            const pinDenied = await adminRequest.patch(`/api/v1/admin/system/board-masters/${bbsId}/posts/${pstSns[1]}/pin`, {
                data: { upendFixYn: 'Y' },
            });
            expect(pinDenied.status()).toBe(403);
            // 상단 고정 조건도 조회로 적용하고 서버가 거른다 — 고정한 글이 없으니 빈 결과다.
            await boardMasterPage.filterPostsByPinned('고정 글', 'pinned=true');
            await expect(page.getByText('조건에 맞는 글이 없습니다.')).toBeVisible({ timeout: 15000 });
            await boardMasterPage.filterPostsByPinned('전체');
            await expect(rowOf(postingTitle)).toBeVisible({ timeout: 15000 });

            // 키보드만으로 일정 바꾸기를 열고 Esc 로 닫는다(입력이 없으면 바로 닫힌다).
            await page.getByRole('button', { name: `${scheduledTitle} 일정 바꾸기` }).focus();
            await page.keyboard.press('Enter');
            await expect(page.getByRole('dialog', { name: '일정 바꾸기' })).toBeVisible({ timeout: 10000 });
            await page.keyboard.press('Escape');
            await expect(page.getByRole('dialog', { name: '일정 바꾸기' })).not.toBeVisible({ timeout: 10000 });

            // 이미 예약된 글은 시작일을 오늘로 당겨 바로 공개한다.
            await boardMasterPage.changePostPeriod(scheduledTitle, { begin: today });
            await expect(rowOf(scheduledTitle).getByText('게시 중', { exact: true })).toBeVisible({ timeout: 15000 });

            await boardMasterPage.bulkChangeEnd([scheduledTitle, postingTitle], nextMonth);
            await expect(rowOf(scheduledTitle)).toContainText(`${today} ~ ${nextMonth}`, { timeout: 15000 });
            await expect(rowOf(postingTitle)).toContainText(nextMonth);

            // 운영 화면에서 바꾼 게시 기간은 게시판 변경 이력에 남는다.
            await page.getByRole('tab', { name: '설정' }).click();
            await page.getByRole('button', { name: '변경 이력' }).click();
            const history = page.getByRole('dialog', { name: `${boardName} 변경 이력` });
            await expect(history).toBeVisible({ timeout: 10000 });
            await expect(history.getByRole('cell', { name: '게시 기간', exact: true }).first()).toBeVisible({ timeout: 15000 });
        } finally {
            for (const pstSn of pstSns) await adminRequest.delete(`/api/v1/boards/${bbsId}/posts/${pstSn}`);
            await adminRequest.post('/api/v1/admin/system/board-masters/batch/status', { data: { bbsIds: [bbsId], useYn: 'N' } });
        }
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
