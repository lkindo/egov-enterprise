import { expect,test } from '../fixtures/browser-test';
import type { Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { screenYmd } from '../helpers/screen-date';
import { buildSpecScope } from '../fixtures/error-detector';
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
            memoRptYmd: screenYmd(),
        } });
        expect(created.status()).toBe(201);
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

test.describe('메모 보고의 읽은 내용과 지시 저장', () => {
    for (const changed of ['본문', '첨부'] as const) {
        test(`${changed} 변경 뒤에는 지시 초안을 보존하고 최신 내용을 확인한 후에만 저장한다`, async ({ actorPage, adminRequest, userRequest }, testInfo) => {
            const recipientActor = await actorPage({ storageState: 'playwright/.auth/user.json' });
            const userPage = recipientActor.page;
            const memos = '/api/v1/memo-reports';
            const title = `E2E memo snapshot ${randomUUID().slice(0, 8)}`;
            const originalBody = `처음 읽은 본문 ${title}`;
            const updatedBody = `작성자가 바꾼 본문 ${title}`;
            const fileName = `${title}.txt`;
            const fileBytes = Buffer.from(`Attachment read before instruction: ${title}\n`, 'utf8');
            let fileGroup = 0;
            let memoId = 0;
            const failures: unknown[] = [];
            try {
                const current = await userRequest.get('/api/v1/auth/me');
                expect(current.status()).toBe(200);
                const recipient = (await current.json()).data.esntlId as string;
                expect(recipient).toBeTruthy();
                const upload = await adminRequest.post('/api/v1/files', {
                    multipart: { files: { name: fileName, mimeType: 'text/plain', buffer: fileBytes } },
                });
                expect(upload.status()).toBe(201);
                fileGroup = (await upload.json()).data as number;
                expect(Number.isSafeInteger(fileGroup)).toBe(true);
                expect(fileGroup).toBeGreaterThan(0);
                const fileList = await adminRequest.get(`/api/v1/files/${fileGroup}`);
                expect(fileList.status()).toBe(200);
                const files = (await fileList.json()).data as Array<{ fileSn: number; orignlFileNm: string }>;
                expect(files).toHaveLength(1);
                expect(files[0].orignlFileNm).toBe(fileName);
                const payload = { rptTtl: title, rptCn: originalBody, rptrId: recipient, memoRptYmd: screenYmd(), atchFileSn: fileGroup };
                const created = await adminRequest.post(memos, { data: payload });
                expect(created.status()).toBe(201);
                memoId = (await created.json()).data as number;
                expect(memoId).toBeGreaterThan(0);

                await userPage.goto('/admin/operation/memo-reports');
                await userPage.getByRole('tab', { name: '수신함', exact: true }).click();
                const search = userPage.getByPlaceholder('보고 제목으로 검색');
                await search.fill(title);
                await search.press('Enter');
                const row = userPage.getByRole('row').filter({ hasText: title });
                const readResponse = userPage.waitForResponse(response => new URL(response.url()).pathname === `${memos}/${memoId}`
                    && response.request().method() === 'GET');
                await row.getByRole('button', { name: `${title} 보고 열기`, exact: true }).click();
                const firstResponse = await readResponse;
                expect(firstResponse.status()).toBe(200);
                const firstRead = (await firstResponse.json()).data;
                expect(firstRead.instructionReadToken).toMatch(/^[a-f0-9]{64}$/);
                expect(firstRead.attachments).toHaveLength(1);
                const dialog = userPage.getByRole('dialog');
                await expect(dialog.getByText(originalBody, { exact: true })).toBeVisible();
                const downloadButton = dialog.getByRole('button', { name: `${fileName} 다운로드`, exact: true });
                const downloadEvent = userPage.waitForEvent('download');
                await downloadButton.click();
                const downloaded = await downloadEvent;
                expect(downloaded.suggestedFilename()).toBe(fileName);
                expect(await downloaded.failure()).toBeNull();
                const stream = await downloaded.createReadStream();
                const chunks: Buffer[] = [];
                for await (const chunk of stream) chunks.push(Buffer.from(chunk));
                expect(Buffer.concat(chunks)).toEqual(fileBytes);

                if (changed === '본문') {
                    const edited = await adminRequest.put(`${memos}/${memoId}`, { data: { ...payload, rptCn: updatedBody } });
                    expect(edited.status()).toBe(200);
                } else {
                    const removed = await adminRequest.delete(`/api/v1/files/${fileGroup}/${files[0].fileSn}`);
                    expect(removed.status()).toBe(200);
                }
                const draft = `보존해야 할 지시 초안 ${title}`;
                const instruction = dialog.getByRole('textbox', { name: '지시사항 남기기 (필수)', exact: true });
                const save = dialog.getByRole('button', { name: '지시사항 등록', exact: true });
                await instruction.fill(draft);
                const requests: Array<{ instructionReadToken: string; drctnMttr: string }> = [];
                recipientActor.guard.expectErrors([{
                    id: 'E2E-MEMO-READ-SNAPSHOT-CONFLICT',
                    specScope: buildSpecScope(testInfo.file, testInfo.title),
                    channel: 'response', urlPattern: new RegExp(`/api/v1/memo-reports/${memoId}/instr-cn$`),
                    messagePattern: null, method: 'PATCH', status: 409, minOccurrences: 1, maxOccurrences: 1,
                    reason: '읽은 본문 또는 첨부가 바뀐 지시 저장은 409 한 번으로 거부하고 명시적 재확인 뒤에만 성공해야 한다.',
                    expiresAt: '2027-01-30',
                }]);
                userPage.on('request', request => {
                    if (request.method() === 'PATCH' && new URL(request.url()).pathname === `${memos}/${memoId}/instr-cn`) {
                        requests.push(request.postDataJSON());
                    }
                });
                const conflictResponse = userPage.waitForResponse(response => new URL(response.url()).pathname === `${memos}/${memoId}/instr-cn`
                    && response.request().method() === 'PATCH');
                await save.click();
                expect((await conflictResponse).status()).toBe(409);
                await expect(dialog.getByRole('button', { name: '최신 내용 불러오기', exact: true })).toBeVisible();
                await expect(instruction).toHaveValue(draft);
                await expect(save).toBeDisabled();
                expect(requests).toEqual([{ instructionReadToken: firstRead.instructionReadToken, drctnMttr: draft }]);
                const rejected = await adminRequest.get(`${memos}/${memoId}`);
                expect(rejected.status()).toBe(200);
                expect((await rejected.json()).data.drctnMttr).toBeNull();

                const latestResponse = userPage.waitForResponse(response => new URL(response.url()).pathname === `${memos}/${memoId}`
                    && response.request().method() === 'GET');
                await dialog.getByRole('button', { name: '최신 내용 불러오기', exact: true }).click();
                const latestHttp = await latestResponse;
                expect(latestHttp.status()).toBe(200);
                const latest = (await latestHttp.json()).data;
                expect(latest.instructionReadToken).toMatch(/^[a-f0-9]{64}$/);
                expect(latest.instructionReadToken).not.toBe(firstRead.instructionReadToken);
                if (changed === '본문') {
                    await expect(dialog.getByText(updatedBody, { exact: true })).toBeVisible();
                } else {
                    expect(latest.attachments).toEqual([]);
                    await expect(downloadButton).toHaveCount(0);
                }
                await expect(instruction).toHaveValue(draft);
                await expect(save).toBeDisabled();
                expect(requests).toHaveLength(1);
                await testInfo.attach(`memo-${changed}-reconfirmation`, { body: await dialog.screenshot(), contentType: 'image/png' });
                await dialog.getByRole('button', { name: '내용을 확인했습니다', exact: true }).click();
                await expect(save).toBeEnabled();
                expect(requests).toHaveLength(1);
                const successResponse = userPage.waitForResponse(response => new URL(response.url()).pathname === `${memos}/${memoId}/instr-cn`
                    && response.request().method() === 'PATCH');
                await save.click();
                expect((await successResponse).status()).toBe(200);
                await expect(dialog.getByText(draft, { exact: true })).toBeVisible();
                expect(requests).toHaveLength(2);
                expect(requests[1]).toEqual({ instructionReadToken: latest.instructionReadToken, drctnMttr: draft });
                const saved = await adminRequest.get(`${memos}/${memoId}`);
                expect(saved.status()).toBe(200);
                expect((await saved.json()).data).toMatchObject({ drctnMttr: draft, rptrInqDt: firstRead.rptrInqDt });
            } catch (failure) {
                failures.push(failure);
            } finally {
                try { await userPage.goto('about:blank'); } catch (failure) { failures.push(failure); }
                if (memoId) {
                    try {
                        expect((await adminRequest.delete(`${memos}/${memoId}`)).status(), '자기 메모 정리').toBe(200);
                    } catch (failure) { failures.push(failure); }
                }
                if (fileGroup) {
                    try {
                        const remaining = await adminRequest.get(`/api/v1/files/${fileGroup}`);
                        expect(remaining.status()).toBe(200);
                        for (const file of (await remaining.json()).data as Array<{ fileSn: number }>) {
                            expect((await adminRequest.delete(`/api/v1/files/${fileGroup}/${file.fileSn}`)).status(), '자기 첨부 정리').toBe(200);
                        }
                    } catch (failure) { failures.push(failure); }
                }
            }
            if (failures.length) throw new AggregateError(failures, 'Memo snapshot journey or owned fixture cleanup failed');
        });
    }
});
