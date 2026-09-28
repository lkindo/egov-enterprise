import { expect,test } from '../fixtures/browser-test';
import type { Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
test.describe('Operational Extension & Uncovered Modules', () => {
    test.use({ storageState: 'playwright/.auth/admin.json' });
    test("외부 인사 목록을 검색하고 등록 버튼을 표시한다", async ({ operationalPage }) => {
        await operationalPage.gotoExternalHr();
        // Search
        await operationalPage.searchExternalHr('홍길동');
        // Verify button
        await expect(operationalPage.page.getByRole('button', { name: '인사 등록' })).toBeVisible();
    });
    test("메모 보고 탭을 전환해도 허브 제목이 유지된다", async ({ operationalPage }) => {
        await operationalPage.gotoMemoReports();
        // 탭 전환 — 각 전환 뒤 허브가 살아 있는지 확인한다.
        // [2026-08-10 정정] 종전에는 마지막에 `const noData = …isVisible(); if (noData) console.log(…)`
        //   뿐이었다. 즉 **단언이 하나도 없는 꼬리**였다: 빈 상태든 아니든, 심지어 화면이 깨져도
        //   그 블록은 아무것도 실패시키지 않는다. 죽은 분기를 지우고, 탭 전환 후에도 허브가
        //   유지되는지를 실제로 단언한다(전환 중 언마운트·크래시가 나면 여기서 red 가 된다).
        //   ⚠ 이것은 스모크다 — '어느 탭이 활성인가'나 '데이터가 맞는가'는 검증하지 않는다.
        //     그 이상을 주장하지 않기 위해 단언 범위를 명시해 둔다.
        for (const tab of ['발신함', '전체', '수신함']) {
            await operationalPage.switchReportTab(tab);
            await expect(operationalPage.page.getByRole('heading', { name: '메모 보고 관리', exact: true }), `'${tab}' 탭 전환 후 메모 보고 허브가 사라졌다`).toBeVisible();
        }
    });
    test('메모 작성자의 정정은 수신자를 유지하고 수신자의 첫 열람만 기록한다', async ({ adminPage, userPage, adminRequest, userRequest }) => {
        const memos = '/api/v1/memo-reports';
        const recipientResponse = await userRequest.get('/api/v1/auth/me');
        expect(recipientResponse.status()).toBe(200);
        const recipient = (await recipientResponse.json()).data.esntlId as string;
        expect(recipient).toBeTruthy();
        const title = `E2E memo ${randomUUID().slice(0, 8)}`;
        const corrected = `${title} corrected`;
        const created = await adminRequest.post(memos, { data: {
            rptTtl: title, rptCn: 'Recipient fixed and first read preserved', rptrId: recipient,
            memoRptYmd: new Date().toISOString().slice(0, 10).replaceAll('-', ''),
        } });
        expect(created.status()).toBe(200);
        const memoId = (await created.json()).data as number;
        let primaryFailure: unknown;
        const openReport = async (page: Page, tab: '발신함' | '수신함', reportTitle: string) => {
            await page.goto('/admin/operation/memo-reports');
            await page.getByRole('tab', { name: tab, exact: true }).click();
            const search = page.getByPlaceholder('보고 제목으로 검색');
            await search.fill(reportTitle);
            await search.press('Enter');
            const row = page.getByRole('row').filter({ hasText: reportTitle });
            await expect(row).toBeVisible();
            const read = page.waitForResponse(response => new URL(response.url()).pathname === `${memos}/${memoId}`
                && response.request().method() === 'GET', { timeout: 20_000 });
            await row.getByRole('button', { name: `${reportTitle} 보고 열기`, exact: true }).click();
            const response = await read;
            expect(response.status()).toBe(200);
            return (await response.json()).data as {
                rptrId: string; rptrInqDt: string | null; rptTtl: string; drctnMttr: string | null;
            };
        };
        try {
            const authorRead = await openReport(adminPage, '발신함', title);
            expect(authorRead.rptrInqDt).toBeNull();
            const dialog = adminPage.getByRole('dialog');
            await dialog.getByRole('button', { name: '수정', exact: true }).click();
            await expect(dialog.getByRole('button', { name: /받는 사람/ })).toHaveCount(0);
            await expect(dialog.locator('input[name="rptrId"]')).toHaveValue(recipient);
            await dialog.getByRole('textbox', { name: '제목 (필수)', exact: true }).fill(corrected);
            const updated = adminPage.waitForResponse(response => new URL(response.url()).pathname === `${memos}/${memoId}`
                && response.request().method() === 'PUT');
            await dialog.getByRole('button', { name: '저장', exact: true }).click();
            expect((await updated).status()).toBe(200);
            await dialog.getByLabel('닫기', { exact: true }).click();
            const saved = await adminRequest.get(`${memos}/${memoId}`);
            expect((await saved.json()).data).toMatchObject({ rptTtl: corrected, rptrId: recipient, rptrInqDt: null });

            const firstRead = await openReport(userPage, '수신함', corrected);
            expect(firstRead.rptrInqDt).toBeTruthy();
            await userPage.getByRole('dialog').getByLabel('닫기', { exact: true }).click();
            const repeatedRead = await openReport(userPage, '수신함', corrected);
            expect(repeatedRead.rptrInqDt).toBe(firstRead.rptrInqDt);
            const recipientDialog = userPage.getByRole('dialog');
            await recipientDialog.getByRole('button', { name: '지시사항 등록', exact: true }).click();
            await expect(recipientDialog.getByText('지시사항을 입력해 주세요.', { exact: true }).first()).toBeVisible();
            const instruction = `검토 후 후속 보고를 작성해 주세요 ${title}`;
            await recipientDialog.getByRole('textbox', { name: '지시사항 남기기 (필수)', exact: true }).fill(instruction);
            const instructed = userPage.waitForResponse(response =>
                new URL(response.url()).pathname === `${memos}/${memoId}/instr-cn`
                && response.request().method() === 'PATCH', { timeout: 20_000 });
            await recipientDialog.getByRole('button', { name: '지시사항 등록', exact: true }).click();
            expect((await instructed).status()).toBe(200);
            await expect(recipientDialog.getByText(instruction, { exact: true })).toBeVisible();
            await recipientDialog.getByLabel('닫기', { exact: true }).click();

            const authorReceivesInstruction = await openReport(adminPage, '발신함', corrected);
            expect(authorReceivesInstruction).toMatchObject({
                rptrId: recipient, rptrInqDt: firstRead.rptrInqDt, drctnMttr: instruction,
            });
            await expect(dialog.getByText(instruction, { exact: true })).toBeVisible();
            await expect(dialog.getByRole('button', { name: '수정', exact: true })).toHaveCount(0);
            await dialog.getByLabel('닫기', { exact: true }).click();
        } catch (error) {
            primaryFailure = error;
            throw error;
        } finally {
            try {
                const owned = await adminRequest.get(`${memos}/${memoId}`);
                expect((await owned.json()).data.rptrId).toBe(recipient);
                expect((await adminRequest.delete(`${memos}/${memoId}`)).status()).toBe(200);
            } catch (cleanupFailure) {
                if (primaryFailure !== undefined) {
                    throw new AggregateError([primaryFailure, cleanupFailure], 'Memo lifecycle and owned fixture cleanup failed');
                }
                throw cleanupFailure;
            }
        }
    });
});
