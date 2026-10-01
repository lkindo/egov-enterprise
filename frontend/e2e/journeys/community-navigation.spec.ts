import { expect,test } from '../fixtures/browser-test';
import { CommunityPage } from '../pages/CommunityPage';
import { randomUUID } from 'node:crypto';
import { collectPageCoverage } from '../fixtures/page-observation';
test.describe('Board & Community (Business Flow)', () => {
    // [2026-08-10 제거] `test.describe.configure({ mode: 'parallel' })`.
    //   playwright.config 는 `workers: 1` 이라(공유 DB 오염·OOM 방지) 이 선언은 **아무 효과가 없었다**.
    //   그럼에도 "병렬 실행 최적화" 라는 주석이 붙어 있어, 아래 테스트들이 워커 격리를 전제로
    //   쓰여 있다는 잘못된 인상을 준다(실제로 `TEST_WORKER_INDEX` 를 이름에 섞는 코드가 그 인상 위에 있다).
    //   워커를 늘리려면 config 의 `workers` 를 바꾸고 **공유 DB 상태를 쓰는 스펙부터 격리**해야 한다 —
    //   그 판단 없이 이 한 줄만 두면 "병렬로 돌고 있다"는 착각만 남는다.
    test.use({ storageState: 'playwright/.auth/admin.json' });
    test('Community of Practice (COP) Matrix Verification', async ({ page }) => {
        const communityPage = new CommunityPage(page);
        await communityPage.goto();
        await communityPage.selectCategory('COMMUNITY');
        await communityPage.verifyCOPList();
        await communityPage.gotoMaster();
    });
    test('신규 사용자는 가입 신청·관리자 승인 뒤 게시판을 보고 탈퇴하면 접근이 끊긴다', async ({ actorPage, adminPage, adminRequest, baseURL }) => {
        const suffix = randomUUID().replaceAll('-', '').slice(0, 10);
        const users = '/api/v1/admin/system/users';
        const communities = '/api/v1/admin/content/community';
        const masters = '/api/v1/admin/system/board-masters';
        const userId = `E2E_CM_${suffix}`;
        const userName = `E2E Community ${suffix}`;
        const communityName = `E2E membership ${suffix}`;
        const boardName = `E2E member board ${suffix}`;
        const password = `Aa1!${randomUUID()}`;
        const actor = await actorPage({ storageState: { cookies: [], origins: [] } });
        let userCreated = false;
        let communityId: number | undefined;
        let boardId: string | undefined;
        let primaryFailure: unknown;
        try {
            const createdUser = await adminRequest.post(users, { data: { userId, userNm: userName, pswd: password, role: 'USER' } });
            userCreated = createdUser.ok();
            expect(createdUser.status()).toBe(200);
            const ownedUser = (await (await adminRequest.get(`${users}/${userId}`)).json()).data;
            expect(ownedUser).toMatchObject({ userId, userNm: userName });
            const login = await adminRequest.post('/api/v1/auth/login', { data: { userId, password } });
            expect(login.status()).toBe(200);
            const token: unknown = (await login.json()).data.accessToken;
            if (typeof token !== 'string' || !token || !baseURL) throw new Error('전용 커뮤니티 사용자 인증 준비에 실패했습니다.');
            // 정상 로그인으로 받은 자격증명을 이 전용 브라우저와 API 검증에서만 사용한다.
            // backend는 쿠키 인증을 하지 않으므로 사후 API 조회에는 Bearer를 명시한다.
            const auth = { Authorization: `Bearer ${token}` };
            await actor.context.addCookies([{ name: 'accessToken', value: token, domain: new URL(baseURL).hostname,
                path: '/', httpOnly: true, secure: true, sameSite: 'Strict' }]);
            await actor.context.addInitScript(() => localStorage.setItem('egov_smart_tour_v1', 'true'));
            const createdCommunity = await adminRequest.post(communities, {
                data: { cmntyNm: communityName, cmntyIntroCn: 'Owned membership browser journey', useYn: 'Y' },
            });
            expect(createdCommunity.status()).toBe(200);
            communityId = (await createdCommunity.json()).data.cmntySn;
            expect(typeof communityId).toBe('number');
            const createdBoard = await adminRequest.post(masters, { data: {
                bbsTtl: boardName, bbsExpln: 'Owned member-only board', bbsTypeCd: 'BBST01', bbsAtrbCd: 'BBSA01',
                atchPsbltyFileSz: 0, useYn: 'Y', cmntySn: communityId, tmpltId: 'TMPLT_LIST',
            } });
            expect(createdBoard.status()).toBe(200);
            boardId = (await createdBoard.json()).data;
            expect(typeof boardId).toBe('string');
            const memberApi = `/api/v1/communities/${communityId}`;
            const memberPath = `/cop/cmy/selectCommunityDetail/${communityId}`;
            const readMembership = async () => {
                const response = await actor.context.request.get(`${memberApi}/membership`, { headers: auth });
                expect(response.status()).toBe(200);
                return (await response.json()).data.status as string;
            };
            await actor.page.goto(memberPath);
            await expect(actor.page.getByRole('heading', { name: communityName, exact: true })).toBeVisible();
            await expect(actor.page.getByRole('link', { name: boardName, exact: false })).toHaveCount(0);
            expect(await readMembership()).toBe('NONE');
            expect((await actor.context.request.get(`${memberApi}/boards`, { headers: auth })).status()).toBe(403);
            const joined = actor.page.waitForResponse(response => new URL(response.url()).pathname === `${memberApi}/join`
                && response.request().method() === 'POST');
            await actor.page.getByRole('button', { name: '커뮤니티 가입 신청', exact: true }).click();
            expect((await joined).status()).toBe(200);
            await expect(actor.page.getByRole('status').filter({ hasText: '가입 승인 대기 중' })).toBeVisible();
            expect(await readMembership()).toBe('REQUESTED');

            await adminPage.goto('/admin/help?tab=COMMUNITY');
            const listed = adminPage.waitForResponse(response => new URL(response.url()).pathname === communities
                && response.request().method() === 'GET');
            await adminPage.getByRole('button', { name: '커뮤니티 관리', exact: true }).click();
            const dialog = adminPage.getByRole('dialog', { name: '커뮤니티 관리', exact: true });
            const pages = (await (await listed).json()).data.totalPage as number;
            // [2026-10-01 결정 20] 승인을 기다리는 신청 수가 버튼 이름에 실린다 — 방금 넣은 신청 1건이 보여야 한다.
            const manageMembers = dialog.getByRole('button', { name: `${communityName} 회원 관리 (가입 신청 1건)`, exact: true });
            await expect(dialog.getByRole('list', { name: '커뮤니티 목록', exact: true })).toBeVisible();
            for (let page = 1; page < pages && await manageMembers.count() === 0; page++) {
                const next = adminPage.waitForResponse(response => new URL(response.url()).pathname === communities
                    && new URL(response.url()).searchParams.get('page') === String(page));
                await dialog.getByRole('link', { name: '다음 페이지로 이동', exact: true }).click();
                expect((await next).status()).toBe(200);
                await expect(dialog.locator('[aria-current="page"]')).toHaveText(String(page + 1));
            }
            await manageMembers.click();
            await expect(dialog.getByRole('heading', { name: `${communityName} 회원 관리`, exact: true })).toBeVisible();
            const approved = adminPage.waitForResponse(response => new URL(response.url()).pathname.startsWith(`${communities}/${communityId}/members/`)
                && new URL(response.url()).pathname.endsWith('/approve') && response.request().method() === 'PATCH');
            await dialog.getByRole('button', { name: `${userName} 가입 승인`, exact: true }).click();
            expect((await approved).status()).toBe(200);
            expect(await readMembership()).toBe('MEMBER');
            await actor.page.reload();
            const boardLink = actor.page.getByRole('link', { name: boardName, exact: false });
            await expect(boardLink).toBeVisible();
            const boards = await actor.context.request.get(`${memberApi}/boards`, { headers: auth });
            expect(boards.status()).toBe(200);
            expect((await boards.json()).data).toEqual(expect.arrayContaining([expect.objectContaining({ bbsId: boardId })]));
            await boardLink.click();
            await expect(actor.page).toHaveURL(new RegExp(`/admin/community/boards/select-board-list\\?bbsId=${boardId}$`));
            await expect(actor.page.getByRole('heading', { name: boardName, exact: true })).toBeVisible();
            await actor.page.goto(memberPath);
            await actor.page.getByRole('button', { name: '커뮤니티 탈퇴', exact: true }).click();
            const left = actor.page.waitForResponse(response => new URL(response.url()).pathname === `${memberApi}/membership`
                && response.request().method() === 'DELETE');
            await actor.page.getByRole('dialog', { name: '커뮤니티 탈퇴', exact: true }).getByRole('button', { name: '탈퇴', exact: true }).click();
            expect((await left).status()).toBe(200);
            await expect(actor.page.getByRole('button', { name: '다시 가입 신청', exact: true })).toBeVisible();
            await expect(actor.page.getByRole('link', { name: boardName, exact: false })).toHaveCount(0);
            expect(await readMembership()).toBe('WITHDRAWN');
            expect((await actor.context.request.get(`${memberApi}/boards`, { headers: auth })).status()).toBe(403);
            expect((await actor.context.request.get(`/api/v1/boards/${boardId}`, { headers: auth })).status()).toBe(403);
        } catch (error) {
            primaryFailure = error;
            throw error;
        } finally {
            try {
                // 실제 페이지 관측을 먼저 마친 뒤 자격증명을 없애 polling의 정리 오류를 방지한다.
                try { await collectPageCoverage(actor.page); } finally { await actor.context.close(); }
                if (boardId !== undefined) {
                    const owned = (await (await adminRequest.get(`${masters}/${boardId}`)).json()).data;
                    expect(owned).toMatchObject({ bbsTtl: boardName, cmntySn: communityId });
                    expect((await adminRequest.delete(`${masters}/${boardId}`)).status()).toBe(200);
                    expect((await adminRequest.delete(`${masters}/${boardId}/physical`)).status()).toBe(200);
                }
                if (communityId !== undefined) {
                    const owned = (await (await adminRequest.get(`${communities}/${communityId}`)).json()).data;
                    expect(owned.cmntyNm).toBe(communityName);
                    expect((await adminRequest.delete(`${communities}/${communityId}`)).status()).toBe(200);
                }
                if (userCreated) {
                    const owned = (await (await adminRequest.get(`${users}/${userId}`)).json()).data;
                    expect(owned).toMatchObject({ userId, userNm: userName });
                    expect((await adminRequest.delete(`${users}/${userId}`)).status()).toBe(200);
                }
            } catch (cleanupFailure) {
                if (primaryFailure !== undefined) {
                    throw new AggregateError([primaryFailure, cleanupFailure], 'Community lifecycle and owned fixture cleanup failed');
                }
                throw cleanupFailure;
            }
        }
    });
    test('커뮤니티 새 템플릿은 활성 원장만 선택하고 기존 비활성 참조는 정정에서 유지한다', async ({ adminPage, adminRequest }) => {
        const templates = '/api/v1/admin/system/templates';
        const communities = '/api/v1/admin/content/community';
        const suffix = randomUUID().replaceAll('-', '').slice(0, 10);
        const active = { tmpltId: `E2ET_A_${suffix}`, tmpltNm: `E2E active ${suffix}`, tmpltSeCd: 'TMPT02', tmpltPath: '/e2e/metadata-only', useYn: 'Y' };
        const inactive = { ...active, tmpltId: `E2ET_N_${suffix}`, tmpltNm: `E2E inactive ${suffix}`, useYn: 'N' };
        const name = `E2E template community ${suffix}`;
        let communityId: number | undefined;
        const createdTemplates: typeof active[] = [];
        try {
            for (const template of [active, inactive]) {
                expect((await adminRequest.post(templates, { data: template })).status()).toBe(200);
                createdTemplates.push(template);
            }
            await adminPage.goto('/admin/help?tab=COMMUNITY');
            await adminPage.getByRole('button', { name: '커뮤니티 관리', exact: true }).click();
            const dialog = adminPage.getByRole('dialog', { name: '커뮤니티 관리', exact: true });
            await dialog.getByRole('combobox', { name: '템플릿', exact: true }).click();
            await expect(adminPage.getByRole('option', { name: active.tmpltNm, exact: true })).toBeVisible();
            await expect(adminPage.getByRole('option', { name: inactive.tmpltNm, exact: true })).toHaveCount(0);
            await adminPage.getByRole('option', { name: active.tmpltNm, exact: true }).click();
            await dialog.getByRole('textbox', { name: '커뮤니티 이름 (필수)', exact: true }).fill(name);
            await dialog.getByLabel('소개', { exact: true }).fill('Metadata reference browser regression');
            const created = adminPage.waitForResponse(response => new URL(response.url()).pathname === communities
                && response.request().method() === 'POST');
            await dialog.getByRole('button', { name: '커뮤니티 등록', exact: true }).click();
            const response = await created;
            expect(response.status()).toBe(200);
            const community = (await response.json()).data;
            communityId = community.cmntySn;
            expect(community.tmpltId).toBe(active.tmpltId);
            expect((await adminRequest.put(`${templates}/${active.tmpltId}`, { data: { ...active, useYn: 'N' } })).status()).toBe(200);

            // 새 브라우저 조회로 캐시를 비운 뒤 기존 참조의 보존을 검증한다.
            await adminPage.reload();
            const listed = adminPage.waitForResponse(result => new URL(result.url()).pathname === communities
                && result.request().method() === 'GET');
            await adminPage.getByRole('button', { name: '커뮤니티 관리', exact: true }).click();
            const pages = (await (await listed).json()).data.totalPage as number;
            const edit = dialog.getByRole('button', { name: `${name} 수정`, exact: true });
            await expect(dialog.getByRole('list', { name: '커뮤니티 목록', exact: true })).toBeVisible();
            for (let page = 1; page < pages && await edit.count() === 0; page++) {
                const next = adminPage.waitForResponse(result => new URL(result.url()).pathname === communities
                    && new URL(result.url()).searchParams.get('page') === String(page));
                await dialog.getByRole('link', { name: '다음 페이지로 이동', exact: true }).click();
                expect((await next).status()).toBe(200);
                await expect(dialog.locator('[aria-current="page"]')).toHaveText(String(page + 1));
            }
            await edit.click();
            await expect(dialog.getByRole('combobox', { name: '템플릿', exact: true })).toContainText(active.tmpltId);
            await dialog.getByRole('combobox', { name: '템플릿', exact: true }).click();
            const retained = adminPage.getByRole('option', { name: `${active.tmpltId} (기존 선택 유지·사용 상태 확인 필요)`, exact: true });
            await expect(retained).toBeVisible();
            await expect(adminPage.getByRole('option', { name: inactive.tmpltNm, exact: true })).toHaveCount(0);
            await retained.click();
            await dialog.getByLabel('소개', { exact: true }).fill('Corrected while keeping the existing inactive template');
            const updated = adminPage.waitForResponse(result => new URL(result.url()).pathname === `${communities}/${communityId}`
                && result.request().method() === 'PUT');
            await dialog.getByRole('button', { name: '수정 저장', exact: true }).click();
            expect((await updated).status()).toBe(200);
            const persisted = await adminRequest.get(`${communities}/${communityId}`);
            expect((await persisted.json()).data).toMatchObject({ tmpltId: active.tmpltId,
                cmntyIntroCn: 'Corrected while keeping the existing inactive template' });
            expect((await adminRequest.delete(`${templates}/${active.tmpltId}`)).status()).toBe(409);
        } finally {
            if (communityId !== undefined) {
                const owned = (await (await adminRequest.get(`${communities}/${communityId}`)).json()).data;
                expect(owned.cmntyNm).toBe(name);
                expect((await adminRequest.put(`${communities}/${communityId}`, {
                    data: { cmntyNm: name, cmntyIntroCn: owned.cmntyIntroCn, tmpltId: null, useYn: 'N' },
                })).status()).toBe(200);
                expect((await adminRequest.delete(`${communities}/${communityId}`)).status()).toBe(200);
            }
            for (const template of createdTemplates) {
                const owned = await adminRequest.get(`${templates}/${template.tmpltId}`);
                expect((await owned.json()).data.tmpltNm).toBe(template.tmpltNm);
                expect((await adminRequest.delete(`${templates}/${template.tmpltId}`)).status()).toBe(200);
            }
        }
    });
    test.describe('Community Supplementary Services Smoke Check', () => {
        // [E2E 감사 Phase0] 동일 URL(/admin/collaboration) 3중 중복 스모크(Community Hub/Smart Scrap/
        // Corporate Addressbook)를 1개로 축약. 실제 협업 거동은 08(collab)·13(mail)이 검증한다.
        // 'Online Polls'(/admin/survey/manage)는 05-public-experience의 설문 생명주기가 소유하므로 제외.
        const services = [
            { name: 'Collaboration Hub', url: '/admin/collaboration' },
            { name: 'Electronic Approvals', url: '/admin/sanctn/workflow' }
        ];
        for (const service of services) {
            test(`Service Availability: ${service.name}`, async ({ page }) => {
                await page.goto(service.url, { waitUntil: 'domcontentloaded' });
                await expect(page.locator('main, .main-content, #content').first()).toBeVisible();
            });
        }
    });
});
