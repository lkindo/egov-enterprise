import { randomUUID } from 'node:crypto';
import { expect, test } from '../fixtures/browser-test';
import { trackApiRequests, waitForHydration } from '../fixtures/hydration';
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

    // 협업 허브의 스크랩 탭(/admin/collaboration/scraps) — 목록 위 모달로 등록·수정하고, 새로고침 단추로 서버 목록을 다시 읽는다.
    test('협업 허브 스크랩 탭에서 스크랩을 등록하고 새로 고친 목록에서 고친다', async ({ page, adminRequest }) => {
        const marker = randomUUID().slice(0, 8);
        const name = `E2E hub scrap ${marker}`;
        const laterName = `E2E hub scrap later ${marker}`;
        const editedName = `E2E hub scrap edited ${marker}`;
        // 등록 폼은 http(s) 절대 주소만 받는다(scrap-form-validation 의 등록 스키마). 사이트 내부 경로는 게시글에서 스크랩할 때와 수정에서만 받는다.
        const scrapUrl = `https://www.egovframe.go.kr/e2e-hub-scrap/${marker}`;
        const description = `허브에서 남긴 스크랩 ${marker}`;
        const editedDescription = `허브에서 고친 설명 ${marker}`;
        const created: number[] = [];
        const openButton = (scrapNm: string) => page.getByRole('button', { name: `${scrapNm} 스크랩 열기`, exact: true });
        // 떠나기 전에 화면이 보낸 /api 요청이 끝나기를 기다린다(끊긴 요청은 오류 감시가 결함으로 본다).
        const hubRequests = trackApiRequests(page);
        try {
            await page.goto('/admin/collaboration/scraps');
            await expect(page.getByRole('tab', { name: '스크랩', exact: true })).toHaveAttribute('aria-selected', 'true');
            await waitForHydration(page.getByRole('button', { name: '스크랩 등록', exact: true }));
            let scrapSn = 0;
            await test.step('Admin: 스크랩 탭에서 스크랩을 등록하면 목록에 보인다', async () => {
                await page.getByRole('button', { name: '스크랩 등록', exact: true }).click();
                const dialog = page.getByRole('dialog', { name: '스크랩 등록', exact: true });
                await dialog.getByRole('textbox', { name: /스크랩명/ }).fill(name);
                await dialog.getByRole('textbox', { name: /참조 URL/ }).fill(scrapUrl);
                await dialog.getByRole('textbox', { name: '설명', exact: true }).fill(description);
                const [saved] = await Promise.all([
                    page.waitForResponse(response => new URL(response.url()).pathname === '/api/v1/scraps'
                        && response.request().method() === 'POST'),
                    dialog.getByTestId('scrap-submit-button').click(),
                ]);
                expect(saved.status()).toBe(201);
                scrapSn = (await saved.json()).data as number;
                expect(Number.isSafeInteger(scrapSn) && scrapSn > 0).toBe(true);
                created.push(scrapSn);
                await expect(dialog).toBeHidden();
                // 등록 뒤 목록을 서버에서 다시 읽어 그 스크랩을 보인다.
                await expect(openButton(name)).toBeVisible();
                const persisted = await adminRequest.get(`/api/v1/scraps/${scrapSn}`);
                expect(persisted.status()).toBe(200);
                expect((await persisted.json()).data).toMatchObject({ scrapSn, scrapNm: name, scrapUrl, scrapExpln: description });
            });
            await test.step('Admin: 새로고침하면 그사이 서버에 생긴 스크랩이 보인다', async () => {
                // 서버는 사용 중인 같은 주소의 스크랩을 409 로 거부한다(ScrapService) — 다른 주소로 만든다.
                const later = await adminRequest.post('/api/v1/scraps', {
                    data: { scrapNm: laterName, scrapUrl: `${scrapUrl}-later`, scrapExpln: '', useYn: 'Y' },
                });
                expect(later.status()).toBe(201);
                created.push((await later.json()).data as number);
                await expect(openButton(laterName)).toHaveCount(0);
                const [refetched] = await Promise.all([
                    page.waitForResponse(response => new URL(response.url()).pathname === '/api/v1/scraps'
                        && response.request().method() === 'GET'),
                    page.getByRole('button', { name: '현재 목록 새로고침', exact: true }).click(),
                ]);
                expect(refetched.status()).toBe(200);
                await expect(openButton(laterName)).toBeVisible();
            });
            await test.step('Admin: 목록에서 스크랩을 열어 이름과 설명을 고친다', async () => {
                await openButton(name).click();
                const dialog = page.getByRole('dialog', { name: '스크랩 수정', exact: true });
                await expect(dialog.getByRole('textbox', { name: /참조 URL/ })).toHaveValue(scrapUrl);
                await expect(dialog.getByRole('textbox', { name: '설명', exact: true })).toHaveValue(description);
                await dialog.getByRole('textbox', { name: /스크랩명/ }).fill(editedName);
                await dialog.getByRole('textbox', { name: '설명', exact: true }).fill(editedDescription);
                const [updated] = await Promise.all([
                    page.waitForResponse(response => new URL(response.url()).pathname === `/api/v1/scraps/${scrapSn}`
                        && response.request().method() === 'PUT'),
                    dialog.getByRole('button', { name: '수정 완료', exact: true }).click(),
                ]);
                expect(updated.status()).toBe(200);
                await expect(dialog).toBeHidden();
                await expect(openButton(editedName)).toBeVisible();
                await expect(openButton(name)).toHaveCount(0);
                const persisted = await adminRequest.get(`/api/v1/scraps/${scrapSn}`);
                expect(persisted.status()).toBe(200);
                expect((await persisted.json()).data).toMatchObject({
                    scrapSn, scrapNm: editedName, scrapUrl, scrapExpln: editedDescription,
                });
                await hubRequests.settled(page.locator('body'));
            });
        } finally {
            // 열린 화면의 재조회가 지운 스크랩을 요청하지 않게 먼저 떠난다. 한 정리가 실패해도 나머지는 수행한다.
            try {
                await page.goto('about:blank');
            } finally {
                for (const id of created) {
                    expect((await adminRequest.delete(`/api/v1/scraps/${id}`)).status()).toBe(200);
                }
            }
        }
    });

    test('협업 허브 기본 경로에서 스크랩 탭으로 전환해 등록·새로고침·수정을 수행한다', async ({ page, adminRequest }) => {
        const marker = randomUUID().slice(0, 8);
        const name = `E2E collab scrap ${marker}`;
        const laterName = `E2E collab scrap later ${marker}`;
        const editedName = `E2E collab scrap edited ${marker}`;
        const scrapUrl = `https://www.egovframe.go.kr/e2e-collab-scrap/${marker}`;
        const created: number[] = [];
        const openButton = (scrapNm: string) => page.getByRole('button', { name: `${scrapNm} 스크랩 열기`, exact: true });
        const hubRequests = trackApiRequests(page);

        try {
            await page.goto('/admin/collaboration');
            const scrapsTab = page.getByRole('tab', { name: '스크랩', exact: true });
            await waitForHydration(scrapsTab);
            await scrapsTab.click();
            await expect(scrapsTab).toHaveAttribute('aria-selected', 'true');
            await page.getByRole('button', { name: '스크랩 등록', exact: true }).click();

            const createDialog = page.getByRole('dialog', { name: '스크랩 등록', exact: true });
            await createDialog.getByRole('textbox', { name: /스크랩명/ }).fill(name);
            await createDialog.getByRole('textbox', { name: /참조 URL/ }).fill(scrapUrl);
            const [saved] = await Promise.all([
                page.waitForResponse(response => new URL(response.url()).pathname === '/api/v1/scraps'
                    && response.request().method() === 'POST'),
                createDialog.getByTestId('scrap-submit-button').click(),
            ]);
            expect(saved.status()).toBe(201);
            const scrapSn = (await saved.json()).data as number;
            created.push(scrapSn);
            await expect(createDialog).toBeHidden();
            await expect(openButton(name)).toBeVisible();

            const later = await adminRequest.post('/api/v1/scraps', {
                data: { scrapNm: laterName, scrapUrl: `${scrapUrl}-later`, scrapExpln: '', useYn: 'Y' },
            });
            expect(later.status()).toBe(201);
            created.push((await later.json()).data as number);
            await expect(openButton(laterName)).toHaveCount(0);

            const [refetched] = await Promise.all([
                page.waitForResponse(response => new URL(response.url()).pathname === '/api/v1/scraps'
                    && response.request().method() === 'GET'),
                page.getByRole('button', { name: '현재 목록 새로고침', exact: true }).click(),
            ]);
            expect(refetched.status()).toBe(200);
            await expect(openButton(laterName)).toBeVisible();

            await openButton(name).click();
            const editDialog = page.getByRole('dialog', { name: '스크랩 수정', exact: true });
            await editDialog.getByRole('textbox', { name: /스크랩명/ }).fill(editedName);
            const [updated] = await Promise.all([
                page.waitForResponse(response => new URL(response.url()).pathname === `/api/v1/scraps/${scrapSn}`
                    && response.request().method() === 'PUT'),
                editDialog.getByRole('button', { name: '수정 완료', exact: true }).click(),
            ]);
            expect(updated.status()).toBe(200);
            await expect(editDialog).toBeHidden();
            await expect(openButton(editedName)).toBeVisible();
            await hubRequests.settled(page.locator('body'));
        } finally {
            try {
                await page.goto('about:blank');
            } finally {
                for (const id of created) {
                    expect((await adminRequest.delete(`/api/v1/scraps/${id}`)).status()).toBe(200);
                }
            }
        }
    });

    test('스크랩 목록 전용 화면에서 신규 등록·새로고침·수정·삭제를 수행한다', async ({ page, adminRequest }) => {
        const marker = randomUUID().slice(0, 8);
        const name = `E2E list scrap ${marker}`;
        const laterName = `E2E list scrap later ${marker}`;
        const editedName = `E2E list scrap edited ${marker}`;
        const scrapUrl = `https://www.egovframe.go.kr/e2e-list-scrap/${marker}`;
        const remainingIds: number[] = [];
        const tracker = trackApiRequests(page);

        const ensureVisibleOnPages = async (targetSn: number, totalPageHint: number) => {
            for (let pageNo = 1; pageNo < totalPageHint; pageNo++) {
                const currentBtn = page.getByRole('button', { name: `${pageNo + 1} 페이지`, exact: true });
                if ((await currentBtn.count()) === 0) break;
                const [paged] = await Promise.all([
                    page.waitForResponse(res => new URL(res.url()).pathname === '/api/v1/scraps'
                        && res.request().method() === 'GET'),
                    page.getByRole('button', { name: '다음 페이지', exact: true }).click(),
                ]);
                const body = (await paged.json()).data as { list: { scrapSn: number }[] };
                if (body.list.some(item => item.scrapSn === targetSn)) return;
            }
        };

        try {
            const firstList = page.waitForResponse(res => new URL(res.url()).pathname === '/api/v1/scraps'
                && res.request().method() === 'GET');
            await scrapPage.goto();
            await firstList;
            const createBtn = page.getByRole('button', { name: '신규 등록', exact: true });
            await waitForHydration(createBtn);

            await createBtn.click();
            const createDialog = page.getByRole('dialog', { name: '스크랩 등록', exact: true });
            await createDialog.getByRole('textbox', { name: /스크랩명/ }).fill(name);
            await createDialog.getByRole('textbox', { name: /참조 URL/ }).fill(scrapUrl);
            const [createdRes, afterCreateList] = await Promise.all([
                page.waitForResponse(res => new URL(res.url()).pathname === '/api/v1/scraps'
                    && res.request().method() === 'POST'),
                page.waitForResponse(res => new URL(res.url()).pathname === '/api/v1/scraps'
                    && res.request().method() === 'GET'),
                createDialog.getByTestId('scrap-submit-button').click(),
            ]);
            expect(createdRes.status()).toBe(201);
            const scrapSn = (await createdRes.json()).data as number;
            remainingIds.push(scrapSn);
            const createdListBody = (await afterCreateList.json()).data as { list: { scrapSn: number }[]; totalPage: number };
            if (!createdListBody.list.some(item => item.scrapSn === scrapSn)) {
                await ensureVisibleOnPages(scrapSn, createdListBody.totalPage);
            }
            await expect(page.getByRole('button', { name: `${name} 수정`, exact: true })).toBeVisible();

            const laterSeed = await adminRequest.post('/api/v1/scraps', {
                data: { scrapNm: laterName, scrapUrl: `${scrapUrl}-later`, scrapExpln: '', useYn: 'Y' },
            });
            expect(laterSeed.status()).toBe(201);
            const laterSn = (await laterSeed.json()).data as number;
            remainingIds.push(laterSn);

            const [refetched] = await Promise.all([
                page.waitForResponse(res => new URL(res.url()).pathname === '/api/v1/scraps'
                    && res.request().method() === 'GET'),
                page.getByRole('button', { name: '스크랩 목록 새로고침', exact: true }).click(),
            ]);
            expect(refetched.status()).toBe(200);

            await page.getByRole('button', { name: `${name} 수정`, exact: true }).click();
            const editDialog = page.getByRole('dialog', { name: '스크랩 수정', exact: true });
            await editDialog.getByRole('textbox', { name: /스크랩명/ }).fill(editedName);
            const [updated] = await Promise.all([
                page.waitForResponse(res => new URL(res.url()).pathname === `/api/v1/scraps/${scrapSn}`
                    && res.request().method() === 'PUT'),
                editDialog.getByRole('button', { name: '수정 완료', exact: true }).click(),
            ]);
            expect(updated.status()).toBe(200);
            await expect(editDialog).toBeHidden();
            await expect(page.getByRole('button', { name: `${editedName} 삭제`, exact: true })).toBeVisible();

            await page.getByRole('button', { name: `${editedName} 삭제`, exact: true }).click();
            const confirmDialog = page.getByRole('dialog').filter({ hasText: '스크랩 삭제' });
            await expect(confirmDialog).toBeVisible();
            const [deleted] = await Promise.all([
                page.waitForResponse(res => new URL(res.url()).pathname === `/api/v1/scraps/${scrapSn}`
                    && res.request().method() === 'DELETE'),
                confirmDialog.getByRole('button', { name: '삭제', exact: true }).click(),
            ]);
            expect(deleted.status()).toBe(200);
            remainingIds.splice(remainingIds.indexOf(scrapSn), 1);
            await expect(page.getByRole('button', { name: `${editedName} 삭제`, exact: true })).toHaveCount(0);
            await tracker.settled(page.locator('body'));
        } finally {
            try {
                await page.goto('about:blank');
            } finally {
                for (const id of remainingIds) {
                    expect((await adminRequest.delete(`/api/v1/scraps/${id}`)).status()).toBe(200);
                }
            }
        }
    });
});
