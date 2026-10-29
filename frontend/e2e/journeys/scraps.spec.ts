import { randomUUID } from 'node:crypto';
import { expect, test } from '../fixtures/browser-test';
import { ScrapPage } from '../pages/ScrapPage';
test.describe('Collaboration & Knowledge Extension', () => {
    test.use({ storageState: 'playwright/.auth/admin.json' });
    let scrapPage: ScrapPage;
    test.beforeEach(async ({ page }) => {
        scrapPage = new ScrapPage(page);
    });
    // [2026-08-10 정정] 종전 본문은 `if (listItems.count() > 0) … else …` 로 **두 갈래 모두 통과**였다.
    //   스크랩은 BBS 글에서 파생되는데 이 테스트는 아무것도 만들지 않으므로, 목록이 비어 있는지
    //   차 있는지는 앞선 테스트들이 남긴 잔여 데이터에 달려 있었다 — 즉 무엇을 검증하는지가
    //   실행 순서에 따라 달라지는 단언이었다. 그 분기를 지우고, 이 테스트가 실제로 보장할 수 있는
    //   것(스크랩 관리 화면이 인증 상태로 정상 렌더된다)만 남긴다.
    //   ScrapPage.goto() 가 라우트 진입 + '스크랩 목록' 헤딩 가시성을 단언하므로 그것이 검증 본체다.
    //   게시글에서 생성한 스크랩의 편집 라운드트립은 아래 별도 과업 시험이 소유한다.
    test('should render the scrap management hub for an authenticated admin', async () => {
        await scrapPage.goto();
    });

    test('게시글에서 스크랩한 내부 URL을 유지하며 이름과 설명을 수정한다', async ({ page, adminRequest }) => {
        const bbsId = 'BBSMSTR_DDDDDDDDDDDD';
        const marker = randomUUID().slice(0, 8);
        const title = `E2E scrap source ${marker}`;
        const editedName = `E2E scrap edited ${marker}`;
        const editedDescription = `게시글을 다시 찾을 설명 ${marker}`;
        let pstSn: number | undefined;
        let scrapSn: number | undefined;
        try {
            // 기존 일반 게시판에 이 시험의 글만 준비한다. 스크랩 생성·수정은 실제 UI를 통과한다.
            const created = await adminRequest.post('/api/v1/boards/posts', {
                data: { bbsId, pstTtl: title, pstCn: '<p>Owned scrap editing browser journey.</p>' },
            });
            expect(created.status()).toBe(201);
            pstSn = (await created.json()).data as number;
            expect(Number.isSafeInteger(pstSn) && pstSn > 0).toBe(true);
            const canonicalPath = `/admin/community/boards/detail?bbsId=${bbsId}&pstSn=${pstSn}`;
            await page.goto(canonicalPath);
            await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();

            const [scraped] = await Promise.all([
                page.waitForResponse(response => new URL(response.url()).pathname === '/api/v1/scraps'
                    && response.request().method() === 'POST'),
                page.getByRole('button', { name: '게시글 스크랩', exact: true }).click(),
            ]);
            expect(scraped.status()).toBe(201);
            scrapSn = (await scraped.json()).data as number;
            expect(Number.isSafeInteger(scrapSn) && scrapSn > 0).toBe(true);
            expect(scraped.request().postDataJSON()).toMatchObject({ scrapNm: title, scrapUrl: canonicalPath });
            await expect(page.getByRole('button', { name: '게시글 스크랩됨', exact: true })).toBeDisabled();

            const firstList = page.waitForResponse(response => new URL(response.url()).pathname === '/api/v1/scraps'
                && response.request().method() === 'GET');
            await scrapPage.goto();
            let listed = await firstList;
            expect(listed.status()).toBe(200);
            let result = (await listed.json()).data as { list: { scrapSn: number }[]; totalPage: number };
            // 목록은 서버 정렬을 보장하지 않으므로 새 스크랩이 첫 페이지에 있다고 가정하지 않는다.
            for (let pageNo = 1; pageNo < result.totalPage && !result.list.some(item => item.scrapSn === scrapSn); pageNo++) {
                [listed] = await Promise.all([
                    page.waitForResponse(response => {
                        const url = new URL(response.url());
                        return url.pathname === '/api/v1/scraps' && url.searchParams.get('page') === String(pageNo + 1)
                            && response.request().method() === 'GET';
                    }),
                    page.getByRole('button', { name: '다음 페이지', exact: true }).click(),
                ]);
                expect(listed.status()).toBe(200);
                result = (await listed.json()).data;
                await expect(page.getByRole('button', { name: `${pageNo + 1} 페이지`, exact: true })).toHaveAttribute('aria-current', 'page');
            }
            await page.getByRole('button', { name: title, exact: true }).click();
            const dialog = page.getByRole('dialog', { name: '스크랩 수정', exact: true });
            const url = dialog.getByRole('textbox', { name: /참조 URL/ });
            await expect(url).toHaveValue(canonicalPath);
            await dialog.getByRole('textbox', { name: /스크랩명/ }).fill(editedName);
            await dialog.getByRole('textbox', { name: '설명', exact: true }).fill(editedDescription);
            const [saved] = await Promise.all([
                page.waitForResponse(response => new URL(response.url()).pathname === `/api/v1/scraps/${scrapSn}`
                    && response.request().method() === 'PUT', { timeout: 30_000 }),
                dialog.getByRole('button', { name: '수정 완료', exact: true }).click(),
            ]);
            expect(saved.status()).toBe(200);
            expect(saved.request().postDataJSON()).toMatchObject({
                scrapNm: editedName, scrapUrl: canonicalPath, scrapExpln: editedDescription, useYn: 'Y',
            });
            await expect(dialog).toBeHidden();
            const persisted = await adminRequest.get(`/api/v1/scraps/${scrapSn}`);
            expect(persisted.status()).toBe(200);
            expect((await persisted.json()).data).toMatchObject({
                scrapSn, scrapNm: editedName, scrapUrl: canonicalPath, scrapExpln: editedDescription,
            });
            await page.getByRole('button', { name: editedName, exact: true }).click();
            await expect(dialog.getByRole('textbox', { name: /스크랩명/ })).toHaveValue(editedName);
            await expect(dialog.getByRole('textbox', { name: '설명', exact: true })).toHaveValue(editedDescription);
            await expect(url).toHaveValue(canonicalPath);
        } finally {
            // 열린 화면의 재조회가 삭제된 글·스크랩을 요청하지 않게 먼저 떠난다. 한 정리가 실패해도 나머지는 수행한다.
            try { await page.goto('about:blank'); } finally {
                try {
                    if (scrapSn !== undefined && Number.isSafeInteger(scrapSn) && scrapSn > 0) {
                        expect((await adminRequest.delete(`/api/v1/scraps/${scrapSn}`)).status()).toBe(200);
                    }
                } finally {
                    if (pstSn !== undefined && Number.isSafeInteger(pstSn) && pstSn > 0) {
                        expect((await adminRequest.delete(`/api/v1/boards/${bbsId}/posts/${pstSn}`)).status()).toBe(200);
                    }
                }
            }
        }
    });
});
