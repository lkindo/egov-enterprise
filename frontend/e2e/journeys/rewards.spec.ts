import { expect,test } from '../fixtures/browser-test';
import { trackApiRequests } from '../fixtures/hydration';
import { getAdminBearerToken } from '../utils/admin-token';
test.describe('Operational Extension & Uncovered Modules', () => {
    test.use({ storageState: 'playwright/.auth/admin.json' });
    /**
     * [2026-09-05 DEC-OPS-036] 포상 정정 경로 — 종전에는 등록만 되고 고칠 수 없었다(감사 D11-01).
     * API 로 만든 기록을 화면에서 찾아 이름을 고치고, 삭제까지 완주한다.
     */
    test("포상 검색 결과 건수를 표시하고 수정·삭제를 반영한다", async ({ operationalPage, request }) => {
        const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1').replace(/\/$/, '');
        // [2026-09-06] storageState 는 frontend/playwright/.auth 에 있다(auth.setup 의 path.resolve 기준 = cwd frontend).
        //   __dirname(frontend/e2e) 기준 경로는 CI 에서 ENOENT 였다(run 33977944030) — 공용 헬퍼가 정본 경로를 안다.
        const adminToken = getAdminBearerToken();
        const headers = { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' };
        const stamp = Date.now();
        const originalName = `E2E 포상 ${stamp}`;
        const renamed = `E2E 포상 정정 ${stamp}`;
        // [2026-10-20] 수상자는 있는 사용 중 계정이어야 한다 — 종전의 'E2E_USER' 같은 아무 문자열은 이제 400 이다.
        //   로그인한 관리자 본인을 수상자로 쓴다(사용 중인 계정이 확실하다).
        const meRes = await request.get(`${API_BASE}/users/me`, { headers });
        expect(meRes.ok(), `본인 조회 실패: ${meRes.status()}`).toBeTruthy();
        const me: { esntlId?: string; userNm?: string } = (await meRes.json()).data;
        expect(me.esntlId, '관리자 내부 식별자').toBeTruthy();
        expect(me.userNm, '관리자 이름').toBeTruthy();
        const ghost = await request.post(`${API_BASE}/admin/operation/rewards`, {
            headers,
            data: { rwardNm: `${originalName} 없는 수상자`, rwardwnrId: 'E2E_NO_SUCH_USER', rwardCode: 'E2E', rwardDe: '20260905', pblenCn: 'e2e 수상자 검사' },
        });
        expect(ghost.status(), '없는 수상자의 포상은 저장하지 않는다').toBe(400);
        expect(String((await ghost.json())?.message ?? '')).toContain('수상자');
        const created = await request.post(`${API_BASE}/admin/operation/rewards`, {
            headers,
            data: { rwardNm: originalName, rwardwnrId: me.esntlId, rwardCode: 'E2E', rwardDe: '20260905', pblenCn: 'e2e 정정 경로 검증' },
        });
        expect(created.ok(), `포상 등록 실패: ${created.status()}`).toBeTruthy();
        await operationalPage.gotoRewards();
        await operationalPage.searchRewards(originalName);
        await expect(operationalPage.page.getByTestId('work-list-toolbar')).toContainText('총');
        await expect(operationalPage.page.getByText(originalName)).toBeVisible();
        // 목록은 수상자를 식별자가 아니라 이름으로 보이고, 식별자는 보조로 둔다.
        const row = operationalPage.page.getByRole('row').filter({ hasText: originalName });
        await expect(row).toContainText(me.userNm!);
        await expect(row).toContainText(`ID ${me.esntlId}`);
        await operationalPage.renameReward(originalName, renamed);
        await operationalPage.searchRewards(renamed);
        await expect(operationalPage.page.getByText(renamed)).toBeVisible();
        await operationalPage.deleteReward(renamed);
        await operationalPage.searchRewards(renamed);
        // 표의 '결과 없음' 문구는 검색어를 그대로 싣는다(G15: "<검색어>"에 대한 검색 결과가 없습니다).
        //   부분 일치 getByText 는 그 문구에 걸려 count 1 이었다(CI run 33980097374) — 이름 셀은 정확 일치로만 센다.
        await expect(operationalPage.page.getByText(/에 대한 검색 결과가 없습니다/)).toBeVisible();
        await expect(operationalPage.page.getByText(renamed, { exact: true })).toHaveCount(0);
    });

    test('포상 기록을 화면에서 등록하고 새로고침과 페이지 이동으로 목록을 확인한다', async ({ operationalPage, page, adminRequest }) => {
        const tag = `E2E_RWD_${Date.now()}`;
        const tracker = trackApiRequests(page);

        try {
            const meRes = await adminRequest.get('/api/v1/users/me');
            expect(meRes.status()).toBe(200);
            const me = (await meRes.json()).data as { esntlId: string; userNm: string };
            expect(me.userNm.length >= 2).toBe(true);

            for (let idx = 1; idx <= 10; idx++) {
                const seeded = await adminRequest.post('/api/v1/admin/operation/rewards', {
                    data: {
                        rwardNm: `${tag}_시드_${String(idx).padStart(2, '0')}`,
                        rwardwnrId: me.esntlId,
                        rwardCode: 'R01',
                        rwardDe: '20261110',
                        pblenCn: `포상 페이징 시드 ${idx}`,
                    },
                });
                expect(seeded.ok()).toBe(true);
            }

            await operationalPage.gotoRewards();
            await page.getByRole('button', { name: '포상 기록 등록', exact: true }).click();
            const createModal = page.getByRole('dialog', { name: '포상 기록 등록', exact: true });
            await expect(createModal).toBeVisible();

            const uiCreatedName = `${tag}_UI등록`;
            await createModal.getByRole('textbox', { name: /^포상 명칭/ }).fill(uiCreatedName);
            await createModal.getByRole('button', { name: '수상자 선택', exact: true }).click();

            const picker = page.getByRole('dialog', { name: '수상자 검색 및 선택', exact: true });
            await expect(picker).toBeVisible();
            await picker.getByLabel('사용자 검색어 입력').fill(me.userNm);
            await picker.getByRole('button', { name: '검색' }).click();
            await picker.getByRole('button', { name: `사용자 선택: ${me.userNm}`, exact: true }).first().click();
            await expect(picker).toBeHidden();

            await createModal.getByRole('textbox', { name: /^포상 코드/ }).fill('R02');
            await createModal.getByRole('textbox', { name: /^포상 일자/ }).fill('20261111');
            await createModal.getByRole('textbox', { name: /^공적 내용/ }).fill('UI 포상 기록 등록 왕복 검증');

            const [createdRes] = await Promise.all([
                page.waitForResponse(res => new URL(res.url()).pathname === '/api/v1/admin/operation/rewards'
                    && res.request().method() === 'POST'),
                createModal.getByRole('button', { name: '최종 등록', exact: true }).click(),
            ]);
            expect(createdRes.ok()).toBe(true);
            await expect(createModal).toBeHidden();

            await operationalPage.searchRewards(tag);
            await expect(page.getByTestId('work-list-toolbar')).toContainText('총 11건');
            await expect(page.locator('tbody tr')).toHaveCount(10);

            const [page2Res] = await Promise.all([
                page.waitForResponse(res => new URL(res.url()).pathname === '/api/v1/admin/operation/rewards'
                    && res.request().method() === 'GET'),
                page.getByRole('button', { name: '다음 페이지', exact: true }).click(),
            ]);
            expect(page2Res.status()).toBe(200);
            await expect(page.locator('tbody tr')).toHaveCount(1);

            await page.getByRole('button', { name: '이전 페이지', exact: true }).click();
            await expect(page.locator('tbody tr')).toHaveCount(10);

            const refreshedName = `${tag}_새로고침`;
            const extraSeed = await adminRequest.post('/api/v1/admin/operation/rewards', {
                data: {
                    rwardNm: refreshedName,
                    rwardwnrId: me.esntlId,
                    rwardCode: 'R03',
                    rwardDe: '20261111',
                    pblenCn: '포상 새로고침 확인',
                },
            });
            expect(extraSeed.ok()).toBe(true);

            const [refreshedRes] = await Promise.all([
                page.waitForResponse(res => new URL(res.url()).pathname === '/api/v1/admin/operation/rewards'
                    && res.request().method() === 'GET'),
                page.getByRole('button', { name: '포상 목록 새로고침', exact: true }).click(),
            ]);
            expect(refreshedRes.status()).toBe(200);
            await expect(page.getByTestId('work-list-toolbar')).toContainText('총 12건');
            await expect(page.getByText(refreshedName, { exact: true })).toBeVisible();
            await tracker.settled(page.getByRole('button', { name: '포상 목록 새로고침', exact: true }));
        } finally {
            try {
                await page.goto('about:blank');
            } finally {
                const listed = await adminRequest.get(`/api/v1/admin/operation/rewards?name=${encodeURIComponent(tag)}&page=1&size=50`);
                if (listed.ok()) {
                    const rows = ((await listed.json()).data?.list ?? []) as Array<{ rwrdSn?: number }>;
                    for (const row of rows) {
                        if (row.rwrdSn !== undefined) {
                            await adminRequest.delete(`/api/v1/admin/operation/rewards/${row.rwrdSn}`);
                        }
                    }
                }
            }
        }
    });
});
