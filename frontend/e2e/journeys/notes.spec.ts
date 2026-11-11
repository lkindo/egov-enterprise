import { randomUUID } from 'node:crypto';
import type { APIRequestContext } from '@playwright/test';
import { expect, test } from '../fixtures/browser-test';
import { trackApiRequests, waitForHydration } from '../fixtures/hydration';

interface NoteListRow {
    noteSn?: number;
    noteRcptnSn?: number;
    noteSndngSn?: number;
}

async function cleanupNotesByMarker(client: APIRequestContext, marker: string) {
    const receivedRes = await client.get(`/api/v1/notes/received?searchWrd=${encodeURIComponent(marker)}&page=1&size=50`);
    if (receivedRes.ok()) {
        const rows = ((await receivedRes.json()).data?.list ?? []) as NoteListRow[];
        for (const row of rows) {
            if (row.noteRcptnSn) {
                const deleted = await client.delete(`/api/v1/notes/${row.noteRcptnSn}?type=received`);
                expect(deleted.status()).toBe(200);
            }
        }
    }
    const sentRes = await client.get(`/api/v1/notes/sent?searchWrd=${encodeURIComponent(marker)}&page=1&size=50`);
    if (sentRes.ok()) {
        const rows = ((await sentRes.json()).data?.list ?? []) as NoteListRow[];
        for (const row of rows) {
            if (row.noteSndngSn) {
                const deleted = await client.delete(`/api/v1/notes/${row.noteSndngSn}?type=sent`);
                expect(deleted.status()).toBe(200);
            }
        }
    }
}

test.describe('쪽지함 및 협업 허브 쪽지 과업 여정', () => {
    test.use({ storageState: 'playwright/.auth/admin.json' });

    test('쪽지함에서 쪽지를 보내고 수신함 열람·답장·보낸함 확인·삭제를 수행한다', async ({
        adminPage,
        userPage,
        adminRequest,
        userRequest,
    }) => {
        const marker = randomUUID().slice(0, 8);
        const noteSubject = `E2E 쪽지 발송 ${marker}`;
        const distractorSubject = `E2E 쪽지 대조군 ${marker}`;
        const noteBody = `쪽지 실제 왕복 본문 ${marker}`;
        const replySubject = `Re: ${noteSubject}`;
        const replyBody = `쪽지 답장 본문 ${marker}`;
        const adminTracker = trackApiRequests(adminPage);
        const userTracker = trackApiRequests(userPage);

        try {
            const [adminMeRes, userMeRes] = await Promise.all([
                adminRequest.get('/api/v1/users/me'),
                userRequest.get('/api/v1/users/me'),
            ]);
            expect(adminMeRes.status()).toBe(200);
            expect(userMeRes.status()).toBe(200);
            const adminMe = (await adminMeRes.json()).data as { esntlId: string; userNm: string };
            const userMe = (await userMeRes.json()).data as { esntlId: string; userNm: string };
            expect(adminMe.userNm.length >= 2).toBe(true);
            expect(userMe.userNm.length >= 2).toBe(true);

            const distractorSeed = await adminRequest.post('/api/v1/notes', {
                data: { rcverId: userMe.esntlId, noteSj: distractorSubject, noteCn: `대조군 본문 ${marker}` },
            });
            expect(distractorSeed.ok()).toBe(true);

            await test.step('발신자(Admin): 새 쪽지를 작성해 수신자에게 발송하고 보낸 쪽지함에서 조회한다', async () => {
                await adminPage.goto('/note');
                const composeBtn = adminPage.getByRole('button', { name: '새 쪽지 쓰기', exact: true });
                await waitForHydration(composeBtn);
                await composeBtn.click();

                const writeDialog = adminPage.getByRole('dialog', { name: '쪽지 쓰기', exact: true });
                await expect(writeDialog).toBeVisible();
                await writeDialog.getByRole('button', { name: '받는 사람 고르기', exact: true }).click();

                const picker = adminPage.getByRole('dialog', { name: '쪽지 받는 사람 선택', exact: true });
                await expect(picker).toBeVisible();
                await picker.getByLabel('사용자 검색어 입력').fill(userMe.userNm);
                await picker.getByRole('button', { name: '검색', exact: true }).click();
                await picker.getByRole('checkbox', { name: `${userMe.userNm} 선택` }).first().check();
                await picker.getByRole('button', { name: /선택 추가/ }).click();
                await expect(picker).toBeHidden();

                await writeDialog.locator('#noteSj').fill(noteSubject);
                await writeDialog.locator('#noteCn').fill(noteBody);
                const [sentRes] = await Promise.all([
                    adminPage.waitForResponse(res => new URL(res.url()).pathname === '/api/v1/notes'
                        && res.request().method() === 'POST'),
                    writeDialog.getByRole('button', { name: '보내기', exact: true }).click(),
                ]);
                expect(sentRes.ok()).toBe(true);
                await expect(writeDialog).toBeHidden();

                await adminPage.getByRole('tab', { name: /보낸 쪽지함/ }).click();
                await expect(adminPage.getByRole('button', { name: `${distractorSubject} 쪽지 열기`, exact: true })).toBeVisible();
                const searchInput = adminPage.getByPlaceholder('제목 또는 내용으로 검색');
                await searchInput.fill(noteSubject);
                const [sentSearchRes] = await Promise.all([
                    adminPage.waitForResponse(res => {
                        const url = new URL(res.url());
                        return url.pathname === '/api/v1/notes/sent'
                            && url.searchParams.get('searchWrd') === noteSubject
                            && res.request().method() === 'GET';
                    }),
                    adminPage.getByRole('button', { name: '조회', exact: true }).click(),
                ]);
                expect(sentSearchRes.status()).toBe(200);
                await expect(adminPage.getByRole('button', { name: `${noteSubject} 쪽지 열기`, exact: true })).toBeVisible();
                await expect(adminPage.getByRole('button', { name: `${distractorSubject} 쪽지 열기`, exact: true })).toHaveCount(0);
            });

            await test.step('수신자(User): 받은 쪽지함에서 검색·상세 열람 후 답장하고 삭제한다', async () => {
                await userPage.goto('/note');
                const searchInput = userPage.getByPlaceholder('제목 또는 내용으로 검색');
                await waitForHydration(searchInput);
                await expect(userPage.getByRole('button', { name: `${distractorSubject} 쪽지 열기`, exact: true })).toBeVisible();
                await searchInput.fill(noteSubject);
                const [receivedSearchRes] = await Promise.all([
                    userPage.waitForResponse(res => {
                        const url = new URL(res.url());
                        return url.pathname === '/api/v1/notes/received'
                            && url.searchParams.get('searchWrd') === noteSubject
                            && res.request().method() === 'GET';
                    }),
                    userPage.getByRole('button', { name: '조회', exact: true }).click(),
                ]);
                expect(receivedSearchRes.status()).toBe(200);

                const openNoteBtn = userPage.getByRole('button', { name: `${noteSubject} 쪽지 열기`, exact: true });
                await expect(openNoteBtn).toBeVisible();
                await expect(userPage.getByRole('button', { name: `${distractorSubject} 쪽지 열기`, exact: true })).toHaveCount(0);
                const [detailRes] = await Promise.all([
                    userPage.waitForResponse(res => /^\/api\/v1\/notes\/\d+$/.test(new URL(res.url()).pathname)
                        && res.request().method() === 'GET'),
                    openNoteBtn.click(),
                ]);
                expect(detailRes.status()).toBe(200);

                const detailDialog = userPage.getByRole('dialog', { name: '쪽지 데이터 상세 정보', exact: true });
                await expect(detailDialog).toBeVisible();
                await expect(detailDialog).toContainText(noteBody);
                await expect(detailDialog).toContainText('읽음');

                await detailDialog.getByRole('button', { name: '답장', exact: true }).click();
                const replyDialog = userPage.getByRole('dialog', { name: '쪽지 쓰기', exact: true });
                await expect(replyDialog).toBeVisible();
                await expect(replyDialog.locator('#noteSj')).toHaveValue(replySubject);
                await replyDialog.locator('#noteCn').fill(replyBody);
                const [repliedRes] = await Promise.all([
                    userPage.waitForResponse(res => new URL(res.url()).pathname === '/api/v1/notes'
                        && res.request().method() === 'POST'),
                    replyDialog.getByRole('button', { name: '보내기', exact: true }).click(),
                ]);
                expect(repliedRes.ok()).toBe(true);
                await expect(replyDialog).toBeHidden();

                await userPage.getByRole('button', { name: `${noteSubject} 삭제`, exact: true }).click();
                const confirmDialog = userPage.getByRole('dialog').filter({ hasText: '쪽지 삭제' });
                await expect(confirmDialog).toBeVisible();
                const [deletedRes] = await Promise.all([
                    userPage.waitForResponse(res => new URL(res.url()).pathname.startsWith('/api/v1/notes/')
                        && res.request().method() === 'DELETE'),
                    confirmDialog.getByRole('button', { name: '삭제', exact: true }).click(),
                ]);
                expect(deletedRes.status()).toBe(200);
                await expect(openNoteBtn).toHaveCount(0);
            });

            await test.step('발신자(Admin): 받은 쪽지함으로 전환해 답장을 확인하고 삭제한다', async () => {
                await adminPage.getByRole('tab', { name: /받은 쪽지함/ }).click();
                const searchInput = adminPage.getByPlaceholder('제목 또는 내용으로 검색');
                await searchInput.fill(replySubject);
                await adminPage.getByRole('button', { name: '조회', exact: true }).click();

                const replyRowBtn = adminPage.getByRole('button', { name: `${replySubject} 쪽지 열기`, exact: true });
                await expect(replyRowBtn).toBeVisible();
                await adminPage.getByRole('button', { name: `${replySubject} 삭제`, exact: true }).click();
                const confirmDialog = adminPage.getByRole('dialog').filter({ hasText: '쪽지 삭제' });
                await expect(confirmDialog).toBeVisible();
                const [deletedReply] = await Promise.all([
                    adminPage.waitForResponse(res => new URL(res.url()).pathname.startsWith('/api/v1/notes/')
                        && res.request().method() === 'DELETE'),
                    confirmDialog.getByRole('button', { name: '삭제', exact: true }).click(),
                ]);
                expect(deletedReply.status()).toBe(200);
                await expect(replyRowBtn).toHaveCount(0);

                await adminTracker.settled(adminPage.locator('body'));
                await userTracker.settled(userPage.locator('body'));
            });
        } finally {
            try {
                await Promise.allSettled([adminPage.goto('about:blank'), userPage.goto('about:blank')]);
            } finally {
                await cleanupNotesByMarker(adminRequest, marker);
                await cleanupNotesByMarker(userRequest, marker);
            }
        }
    });

    test('협업 허브 쪽지 탭에서 받은 쪽지를 조회·검색·새로고침한다', async ({ page, adminRequest, userRequest }) => {
        const marker = randomUUID().slice(0, 8);
        const firstSubject = `E2E 허브쪽지 초기 ${marker}`;
        const laterSubject = `E2E 허브쪽지 추가 ${marker}`;
        const tracker = trackApiRequests(page);

        try {
            const adminMeRes = await adminRequest.get('/api/v1/users/me');
            expect(adminMeRes.status()).toBe(200);
            const adminMe = (await adminMeRes.json()).data as { esntlId: string };

            const seedFirst = await userRequest.post('/api/v1/notes', {
                data: { rcverId: adminMe.esntlId, noteSj: firstSubject, noteCn: `초기 본문 ${marker}` },
            });
            expect(seedFirst.ok()).toBe(true);

            await test.step('/admin/collaboration 기본 쪽지 탭에서 목록 조회·새로고침·검색을 수행한다', async () => {
                await page.goto('/admin/collaboration');
                await expect(page.getByRole('tab', { name: '쪽지', exact: true })).toHaveAttribute('aria-selected', 'true');
                const refreshBtn = page.getByRole('button', { name: '현재 목록 새로고침', exact: true });
                await waitForHydration(refreshBtn);
                await expect(page.getByText(firstSubject, { exact: true })).toBeVisible();

                const seedLater = await userRequest.post('/api/v1/notes', {
                    data: { rcverId: adminMe.esntlId, noteSj: laterSubject, noteCn: `추가 본문 ${marker}` },
                });
                expect(seedLater.ok()).toBe(true);
                await expect(page.getByText(laterSubject, { exact: true })).toHaveCount(0);

                const [refetched] = await Promise.all([
                    page.waitForResponse(res => new URL(res.url()).pathname === '/api/v1/notes/received'
                        && res.request().method() === 'GET'),
                    refreshBtn.click(),
                ]);
                expect(refetched.status()).toBe(200);
                await expect(page.getByText(laterSubject, { exact: true })).toBeVisible();

                const searchInput = page.getByPlaceholder('쪽지 검색어를 입력하세요');
                await searchInput.fill(laterSubject);
                await page.getByRole('button', { name: '조회', exact: true }).click();
                await expect(page.getByText(laterSubject, { exact: true })).toBeVisible();
                await expect(page.getByText(firstSubject, { exact: true })).toHaveCount(0);
            });

            await test.step('/admin/collaboration/scraps 경로에서 쪽지 탭으로 전환해 조회·검색·새로고침을 수행한다', async () => {
                await page.goto('/admin/collaboration/scraps');
                const notesTab = page.getByRole('tab', { name: '쪽지', exact: true });
                await waitForHydration(notesTab);
                await notesTab.click();
                await expect(notesTab).toHaveAttribute('aria-selected', 'true');
                await expect(page.getByText(firstSubject, { exact: true })).toBeVisible();

                const searchInput = page.getByPlaceholder('쪽지 검색어를 입력하세요');
                await searchInput.fill(firstSubject);
                await page.getByRole('button', { name: '조회', exact: true }).click();
                await expect(page.getByText(firstSubject, { exact: true })).toBeVisible();
                await expect(page.getByText(laterSubject, { exact: true })).toHaveCount(0);

                const [refetched] = await Promise.all([
                    page.waitForResponse(res => new URL(res.url()).pathname === '/api/v1/notes/received'
                        && res.request().method() === 'GET'),
                    page.getByRole('button', { name: '현재 목록 새로고침', exact: true }).click(),
                ]);
                expect(refetched.status()).toBe(200);
                await tracker.settled(page.locator('body'));
            });
        } finally {
            try {
                await page.goto('about:blank');
            } finally {
                await cleanupNotesByMarker(adminRequest, marker);
                await cleanupNotesByMarker(userRequest, marker);
            }
        }
    });
});
