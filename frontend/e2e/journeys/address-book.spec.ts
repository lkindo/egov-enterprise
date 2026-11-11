import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import { expect, test } from '../fixtures/browser-test';
import { trackApiRequests, waitForHydration } from '../fixtures/hydration';
/**
 * Advanced Collaboration & Intelligence
 * 실제 UI 상호작용을 통한 협업 도구 및 지능형 분석 기능 검증
 */
test.describe('Advanced Collaboration & Intelligence', () => {
    test.use({
        storageState: 'playwright/.auth/admin.json',
        viewport: { width: 1920, height: 1080 }
    });
    test("협업 허브에서 주소록 등록 dialog를 열고 등록한 연락처를 검색한다", async ({ collabPage, page, adminRequest }) => {
        console.log('\n>>> Starting Collaboration: Register Identity Flow');
        const suffix = Math.random().toString(36).substring(7);
        const testName = `Identity_${suffix}`;
        const testEmail = `${testName}@egov.enterprise.com`;
        const tracker = trackApiRequests(page);
        try {
            await collabPage.goto();
            await collabPage.createContact(testName, testEmail);
            console.log('>>> Identity registered. Verifying visibility in Address Book.');
            // 주소록은 collaboration 허브의 탭이 아니라 demo pack 전용 목록 라우트에서 관리한다.
            await expect(page).toHaveURL(/\/admin\/collaboration\/address-book\/select-address-book-list/);
            await collabPage.verifyIdentityInList(testName);
            await tracker.settled(page.locator('body'));
        } finally {
            try {
                await page.goto('about:blank');
            } finally {
                const listed = await adminRequest.get(`/api/v1/address-books?searchWrd=${encodeURIComponent(testName)}&page=1&size=20`);
                if (listed.ok()) {
                    const items = ((await listed.json()).data?.list ?? []) as Array<{ adbkSn?: number }>;
                    for (const item of items) {
                        if (item.adbkSn) await adminRequest.delete(`/api/v1/address-books/${item.adbkSn}`);
                    }
                }
            }
        }
    });

    test('주소록 목록 조회·검색·새로고침·내보내기와 상세 구성원 편집·명칭 저장·삭제를 완주한다', async ({ page, adminRequest }) => {
        const marker = randomUUID().slice(0, 8);
        const detailBookName = `E2E 주소록상세 ${marker}`;
        const renamedBookName = `E2E 주소록개명 ${marker}`;
        const listDeleteBookName = `E2E 주소록목록삭제 ${marker}`;
        const memberName = `구성원_${marker}`;
        const tracker = trackApiRequests(page);
        const seededIds: number[] = [];

        try {
            const detailSeed = await adminRequest.post('/api/v1/address-books', {
                data: { adbkNm: detailBookName, rlsScopeCd: 'P', adbkMan: [] },
            });
            expect(detailSeed.status()).toBe(201);
            const detailSn = (await detailSeed.json()).data as number;
            seededIds.push(detailSn);

            await test.step('목록에서 새로고침·검색·현재 페이지 내보내기·목록 삭제를 수행한다', async () => {
                await page.goto('/admin/collaboration/address-book/select-address-book-list');
                const refreshBtn = page.getByRole('button', { name: '주소록 목록 새로고침', exact: true });
                await waitForHydration(refreshBtn);

                const listSeed = await adminRequest.post('/api/v1/address-books', {
                    data: { adbkNm: listDeleteBookName, rlsScopeCd: 'P', adbkMan: [] },
                });
                expect(listSeed.status()).toBe(201);
                const listSn = (await listSeed.json()).data as number;
                seededIds.push(listSn);

                const [refetched] = await Promise.all([
                    page.waitForResponse(res => new URL(res.url()).pathname === '/api/v1/address-books'
                        && res.request().method() === 'GET'),
                    refreshBtn.click(),
                ]);
                expect(refetched.status()).toBe(200);

                const searchInput = page.getByLabel('주소록 검색');
                await searchInput.fill(listDeleteBookName);
                const [searchedListRes] = await Promise.all([
                    page.waitForResponse(res => {
                        const url = new URL(res.url());
                        return url.pathname === '/api/v1/address-books'
                            && url.searchParams.get('searchWrd') === listDeleteBookName
                            && res.request().method() === 'GET';
                    }),
                    page.getByRole('button', { name: '검색', exact: true }).click(),
                ]);
                expect(searchedListRes.status()).toBe(200);
                await expect(page.getByRole('link', { name: listDeleteBookName, exact: true })).toBeVisible();
                await expect(page.getByRole('link', { name: detailBookName, exact: true })).toHaveCount(0);

                const [download] = await Promise.all([
                    page.waitForEvent('download'),
                    page.getByRole('button', { name: '현재 페이지 엑셀 내보내기', exact: true }).click(),
                ]);
                expect(download.suggestedFilename()).toMatch(/^address_book_\d{4}-\d{2}-\d{2}\.csv$/);
                const downloadedPath = await download.path();
                expect(downloadedPath).toBeTruthy();
                const csvContent = fs.readFileSync(downloadedPath!, 'utf8');
                expect(csvContent).toContain(listDeleteBookName);
                expect(csvContent).not.toContain(detailBookName);

                await page.getByRole('button', { name: `${listDeleteBookName} 주소록 삭제`, exact: true }).click();
                const confirmDialog = page.getByRole('dialog').filter({ hasText: '주소록 삭제' });
                await expect(confirmDialog).toBeVisible();
                const [deleted] = await Promise.all([
                    page.waitForResponse(res => new URL(res.url()).pathname === `/api/v1/address-books/${listSn}`
                        && res.request().method() === 'DELETE'),
                    confirmDialog.getByRole('button', { name: '삭제', exact: true }).click(),
                ]);
                expect(deleted.status()).toBe(200);
                seededIds.splice(seededIds.indexOf(listSn), 1);
                await expect(page.getByRole('link', { name: listDeleteBookName, exact: true })).toHaveCount(0);
            });

            await test.step('상세 화면에서 명칭 초안을 유지한 채 구성원 추가·수정·삭제 후 명칭 저장과 주소록 삭제를 수행한다', async () => {
                const searchInput = page.getByLabel('주소록 검색');
                await searchInput.fill(detailBookName);
                const [detailSearchRes] = await Promise.all([
                    page.waitForResponse(res => {
                        const url = new URL(res.url());
                        return url.pathname === '/api/v1/address-books'
                            && url.searchParams.get('searchWrd') === detailBookName
                            && res.request().method() === 'GET';
                    }),
                    page.getByRole('button', { name: '검색', exact: true }).click(),
                ]);
                expect(detailSearchRes.status()).toBe(200);
                await page.getByRole('link', { name: detailBookName, exact: true }).click();

                await expect(page).toHaveURL(new RegExp(`/admin/collaboration/address-book/select-address-book-detail/${detailSn}$`));
                const nameInput = page.locator('#adbkNm');
                await expect(nameInput).toHaveValue(detailBookName);

                // 명칭 초안을 먼저 바꾼 상태에서 구성원을 추가한 뒤 곧장 명칭을 저장해도 editToken 자기 충돌(409)이 없어야 한다.
                await nameInput.fill(renamedBookName);
                await page.getByRole('button', { name: '구성원 추가', exact: true }).click();
                const addDialog = page.getByRole('dialog', { name: '구성원 추가', exact: true });
                await expect(addDialog).toBeVisible();
                await addDialog.locator('#member-nm').fill(memberName);
                await addDialog.locator('#member-telNo').fill('010-1234-5678');
                await addDialog.locator('#member-email').fill(`${marker}@example.com`);
                const [memberAdded] = await Promise.all([
                    page.waitForResponse(res => new URL(res.url()).pathname === `/api/v1/address-books/${detailSn}`
                        && res.request().method() === 'PUT'),
                    addDialog.getByRole('button', { name: '구성원 추가', exact: true }).click(),
                ]);
                expect(memberAdded.status()).toBe(200);
                await expect(addDialog).toBeHidden();
                await expect(page.getByRole('cell', { name: memberName, exact: true })).toBeVisible();
                await expect(nameInput).toHaveValue(renamedBookName);

                const [nameSaved] = await Promise.all([
                    page.waitForResponse(res => new URL(res.url()).pathname === `/api/v1/address-books/${detailSn}`
                        && res.request().method() === 'PUT'),
                    page.getByRole('button', { name: '저장', exact: true }).click(),
                ]);
                expect(nameSaved.status()).toBe(200);
                await expect(page).toHaveURL(/\/admin\/collaboration\/address-book\/select-address-book-list/);
                const listSearchInput = page.getByLabel('주소록 검색');
                await listSearchInput.fill(renamedBookName);
                await page.getByRole('button', { name: '검색', exact: true }).click();
                const renamedLink = page.getByRole('link', { name: renamedBookName, exact: true });
                await expect(renamedLink).toBeVisible();
                await renamedLink.click();
                await expect(page).toHaveURL(new RegExp(`/admin/collaboration/address-book/select-address-book-detail/${detailSn}$`));
                await expect(page.locator('#adbkNm')).toHaveValue(renamedBookName);
                await expect(page.getByRole('cell', { name: memberName, exact: true })).toBeVisible();

                await page.getByRole('button', { name: `${memberName} 수정`, exact: true }).click();
                const editDialog = page.getByRole('dialog', { name: '구성원 수정', exact: true });
                await expect(editDialog).toBeVisible();
                await editDialog.locator('#member-telNo').fill('010-9876-5432');
                const [memberUpdated] = await Promise.all([
                    page.waitForResponse(res => new URL(res.url()).pathname === `/api/v1/address-books/${detailSn}`
                        && res.request().method() === 'PUT'),
                    editDialog.getByRole('button', { name: '구성원 저장', exact: true }).click(),
                ]);
                expect(memberUpdated.status()).toBe(200);
                await expect(editDialog).toBeHidden();
                await expect(page.getByRole('cell', { name: '01098765432', exact: true })).toBeVisible();

                await page.getByRole('button', { name: `${memberName} 삭제`, exact: true }).click();
                const memberDeleteConfirm = page.getByRole('dialog').filter({ hasText: '구성원 삭제' });
                await expect(memberDeleteConfirm).toBeVisible();
                const [memberDeleted] = await Promise.all([
                    page.waitForResponse(res => new URL(res.url()).pathname === `/api/v1/address-books/${detailSn}`
                        && res.request().method() === 'PUT'),
                    memberDeleteConfirm.getByRole('button', { name: '삭제', exact: true }).click(),
                ]);
                expect(memberDeleted.status()).toBe(200);
                await expect(page.getByText('등록된 구성원이 없습니다.')).toBeVisible();

                await page.getByRole('button', { name: `${renamedBookName} 주소록 삭제`, exact: true }).click();
                const bookDeleteConfirm = page.getByRole('dialog').filter({ hasText: '주소록 삭제' });
                await expect(bookDeleteConfirm).toBeVisible();
                const [bookDeleted] = await Promise.all([
                    page.waitForResponse(res => new URL(res.url()).pathname === `/api/v1/address-books/${detailSn}`
                        && res.request().method() === 'DELETE'),
                    bookDeleteConfirm.getByRole('button', { name: '삭제', exact: true }).click(),
                ]);
                expect(bookDeleted.status()).toBe(200);
                seededIds.splice(seededIds.indexOf(detailSn), 1);
                await expect(page).toHaveURL(/\/admin\/collaboration\/address-book\/select-address-book-list/);
                await tracker.settled(page.getByRole('button', { name: '주소록 목록 새로고침', exact: true }));
            });
        } finally {
            try {
                await page.goto('about:blank');
            } finally {
                for (const id of seededIds) {
                    await adminRequest.delete(`/api/v1/address-books/${id}`);
                }
            }
        }
    });
});
