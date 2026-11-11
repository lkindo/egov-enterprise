import { randomUUID } from 'node:crypto';
import { expect, test } from '../fixtures/browser-test';
import { trackApiRequests, waitForHydration } from '../fixtures/hydration';
import { SearchPage } from '../pages/SearchPage';

test.describe('전역 검색', () => {
    const ADMIN_STORAGE_STATE = 'playwright/.auth/admin.json';
    test.use({ storageState: ADMIN_STORAGE_STATE });
    test.describe('Admin Observability & Workspace Intelligence', () => {
        test('전역 검색어가 URL에 반영되고 결과 없음 안내를 표시한다', async ({ page }) => {
            const search = new SearchPage(page);
            await search.navigate();
            console.log('>>> Searching for non-existent keyword');
            await search.performSearch('XYZ_NON_EXISTENT_KEYWORD_123');
            console.log('>>> Verifying empty state message');
            await search.verifyNoResults();
        });

        test('통합 검색에서 게시글·임직원·권한 범위 메뉴 바로가기를 조회하고 이동한다', async ({ page, userPage, adminRequest }) => {
            const bbsId = 'BBSMSTR_DDDDDDDDDDDD';
            const marker = randomUUID().slice(0, 8);
            const postTitle = `E2E 통합검색 게시글 ${marker}`;
            let pstSn: number | undefined;

            try {
                const meRes = await adminRequest.get('/api/v1/users/me');
                expect(meRes.status()).toBe(200);
                const me = (await meRes.json()).data as { userNm?: string };
                expect(me.userNm && me.userNm.trim().length >= 2).toBe(true);

                const created = await adminRequest.post('/api/v1/boards/posts', {
                    data: { bbsId, pstTtl: postTitle, pstCn: '<p>통합 검색 E2E 왕복 본문입니다.</p>' },
                });
                expect(created.status()).toBe(201);
                pstSn = (await created.json()).data as number;
                expect(Number.isSafeInteger(pstSn) && pstSn > 0).toBe(true);

                await test.step('게시글 키워드 검색 후 상세 화면으로 이동한다', async () => {
                    const articleNavRequests = trackApiRequests(page);
                    await page.goto('/search');
                    const input = page.getByLabel('통합검색어');
                    await waitForHydration(input);
                    const [articleRes] = await Promise.all([
                        page.waitForResponse(res => new URL(res.url()).pathname === '/api/v1/boards/search'
                            && res.request().method() === 'GET'),
                        (async () => {
                            await input.fill(postTitle);
                            await page.getByRole('button', { name: '검색 실행', exact: true }).click();
                        })(),
                    ]);
                    expect(articleRes.status()).toBe(200);
                    const articleSection = page.locator('section').filter({
                        has: page.getByRole('heading', { name: '게시글', exact: true }),
                    });
                    await expect(articleSection).toBeVisible();
                    const postLink = articleSection.getByRole('link').filter({ hasText: postTitle });
                    await expect(postLink).toBeVisible();
                    await postLink.click();
                    await expect(page).toHaveURL(new RegExp(`/admin/community/boards/detail\\?bbsId=${bbsId}&pstSn=${pstSn}`));
                    const detailHeading = page.getByRole('heading', { name: postTitle, exact: true });
                    await expect(detailHeading).toBeVisible();
                    await articleNavRequests.settled(detailHeading);
                });

                await test.step('임직원 성명 키워드 검색 결과를 표시한다', async () => {
                    const userSearchRequests = trackApiRequests(page);
                    await page.goto('/search');
                    const input = page.getByLabel('통합검색어');
                    await waitForHydration(input);
                    const [userRes] = await Promise.all([
                        page.waitForResponse(res => new URL(res.url()).pathname === '/api/v1/users/search'
                            && res.request().method() === 'GET'),
                        (async () => {
                            await input.fill(me.userNm!);
                            await page.getByRole('button', { name: '검색 실행', exact: true }).click();
                        })(),
                    ]);
                    expect(userRes.status()).toBe(200);
                    const userSection = page.locator('section').filter({
                        has: page.getByRole('heading', { name: '임직원', exact: true }),
                    });
                    await expect(userSection).toBeVisible();
                    await expect(userSection).toContainText(me.userNm!);
                    await userSearchRequests.settled(input);
                });

                await test.step('메뉴 바로가기는 사용자 권한 범위로 거르고 선택 시 해당 화면으로 이동한다', async () => {
                    const userRequests = trackApiRequests(userPage);
                    await userPage.goto('/search');
                    const userInput = userPage.getByLabel('통합검색어');
                    await waitForHydration(userInput);
                    await userInput.fill('포상');
                    await userPage.getByRole('button', { name: '검색 실행', exact: true }).click();
                    await expect(userPage).toHaveURL(/\/search\?q=/);
                    await userRequests.settled(userPage.getByLabel('통합검색어'));
                    await expect(userPage.locator('a[href="/admin/operation/rewards"]')).toHaveCount(0);

                    const adminRequests = trackApiRequests(page);
                    await page.goto('/search');
                    const adminInput = page.getByLabel('통합검색어');
                    await waitForHydration(adminInput);
                    await adminInput.fill('포상');
                    await page.getByRole('button', { name: '검색 실행', exact: true }).click();
                    const menuSection = page.locator('section').filter({
                        has: page.getByRole('heading', { name: '바로가기', exact: true }),
                    });
                    await expect(menuSection).toBeVisible();
                    const rewardShortcut = menuSection.locator('a[href="/admin/operation/rewards"]');
                    await expect(rewardShortcut).toBeVisible();
                    await rewardShortcut.click();
                    await expect(page).toHaveURL(/\/admin\/operation\/rewards/);
                    await expect(page.getByRole('heading', { name: '포상 기록 관리', exact: true })).toBeVisible();
                    await adminRequests.settled(page.getByRole('button', { name: '포상 목록 새로고침', exact: true }));
                });
            } finally {
                try {
                    await Promise.allSettled([page.goto('about:blank'), userPage.goto('about:blank')]);
                } finally {
                    if (pstSn !== undefined && Number.isSafeInteger(pstSn) && pstSn > 0) {
                        expect((await adminRequest.delete(`/api/v1/boards/${bbsId}/posts/${pstSn}`)).status()).toBe(200);
                    }
                }
            }
        });
    });
});
