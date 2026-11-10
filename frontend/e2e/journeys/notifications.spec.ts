import { APIRequestContext,APIResponse } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { expect,test } from '../fixtures/browser-test';
import { trackApiRequests, waitForHydration } from '../fixtures/hydration';
import { NotificationPage } from '../pages/NotificationPage';
// [2026-07-28 정정] 백엔드 주소를 세 곳에 하드코딩하고 있었다. auth.setup.ts·cleanup-db.ts 는 이미
//   `process.env.NEXT_PUBLIC_API_URL || 기본값` 패턴을 쓰는데 이 파일만 예외였다. 백엔드를 다른
//   포트에 띄우면 시드 POST 가 엉뚱한 서비스로 새어 알림이 생성되지 않고, 그 뒤 UI 단언이 전부
//   무너진다(실측 3건 red). 저장소 표준 패턴에 맞춘다.
const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1').replace(/\/$/, '');
test.describe('Notification & Communication Intelligence', () => {
    test.use({ storageState: path.join(__dirname, '..', '..', 'playwright', '.auth', 'admin.json') });
    let notificationPage: NotificationPage;
    let adminToken: string;
    test.beforeAll(async () => {
        // Load admin token for API calls
        const authPath = path.join(__dirname, '..', '..', 'playwright', '.auth', 'admin.json');
        console.log(`>>> Loading auth from: ${authPath}`);
        if (fs.existsSync(authPath)) {
            const authData = JSON.parse(fs.readFileSync(authPath, 'utf-8'));
            adminToken = authData.cookies.find((c: { name: string; value?: string }) => c.name === 'accessToken')?.value;
            console.log(`>>> Admin token loaded: ${adminToken ? 'SUCCESS' : 'FAILED'}`);
        }
    });
    test.beforeEach(async ({ page }) => {
        notificationPage = new NotificationPage(page);
        await page.goto('/');
        await page.waitForLoadState('networkidle');
    });
    /**
     * 이 spec 이 만든 알림을 지운다.
     *
     * <p>⚠ [2026-09-01 신설] 종전에는 세 테스트가 알림을 API 로 만들고 **아무것도 지우지 않았다.**
     * globalTeardown 도 도와주지 못한다 — `e2e/scripts/cleanup-db.ts` 의 카테고리 목록에
     * 알림 축이 아예 없어서(실측 0건) 잔존분이 영구히 남는다.
     *
     * <p>남은 알림은 조용히 다른 단언을 오염시킨다. 이 파일의 `count > 0` 단언은 **다른 테스트가
     * 남긴 알림으로도 만족**되므로, 방금 만든 것이 실제로 전달됐는지를 더 이상 증명하지 못한다.
     * 같은 계열의 사고가 이미 실측됐다 — 05-public-experience 는 배너가 7건 누적되자
     * 격리 실행에서도 100% 실패했다(그 파일 :81-85 기록).
     *
     * <p>삭제 실패는 테스트를 깨뜨리지 않는다(정리는 계약이 아니다). 다만 조용히 넘기지 않고
     * 로그로 남겨, 잔존이 쌓이는 상황을 사람이 볼 수 있게 한다.
     */
    async function deleteNotification(request: APIRequestContext, notiSn: unknown): Promise<void> {
        if (notiSn === undefined || notiSn === null || notiSn === '')
            return;
        const res = await request.delete(`${API_BASE}/notifications/${notiSn}`, {
            headers: { 'Authorization': `Bearer ${adminToken}` },
        });
        if (!res.ok()) {
            console.warn(`>>> [cleanup] 알림 ${notiSn} 삭제 실패(${res.status()}) — 잔존분이 누적됩니다.`);
        }
    }
    /** 생성 응답에서 알림 식별자를 꺼낸다. 래퍼(`data`)와 평문 양쪽을 받는다. */
    async function createdNotificationId(response: APIResponse): Promise<unknown> {
        try {
            const body = await response.json();
            return body?.data?.notiSn ?? body?.data ?? body?.notiSn ?? null;
        }
        catch {
            return null;
        }
    }
    test('Notification: Real-time Delivery and Read Flow', async ({ request, page }) => {
        const testTitle = `E2E_Notif_${Date.now()}`;
        const testMessage = 'System integrity check required for the communication node.';
        console.log('>>> Waiting for WebSocket connection...');
        // [2026-09-25] 연결 상태 문구는 연결만 말한다('실시간 연결됨' | '연결 끊김'). 종전 문구는 집계
        //   가용 여부까지 섞어('통계 수신 중'·'통계 수신 대기 중'·'일부 통계 확인 불가') 게시글·알림 집계가
        //   실패하면 연결이 멀쩡해도 이 대기가 실패했다. 집계 상태는 이 여정이 보는 대상이 아니다.
        await expect(page.getByRole('status').filter({ hasText: /^실시간 연결됨$/ })).toBeVisible({ timeout: 15000 });
        console.log('>>> Step 1: Creating notification via API');
        // Create notification for the current user (webmaster)
        const response = await request.post(`${API_BASE}/notifications`, {
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            },
            data: {
                notiTtlNm: testTitle,
                notiCn: testMessage,
                readYn: 'N',
                rcvrId: 'webmaster'
            }
        });
        console.log(`>>> API Response Status: ${response.status()}`);
        if (!response.ok()) {
            const errorText = await response.text();
            console.log(`>>> API Error Body: ${errorText}`);
        }
        expect(response.ok()).toBeTruthy();
        const createdId = await createdNotificationId(response);
        try {
            console.log('>>> Step 2: Verifying real-time badge update');
            // Wait for WebSocket delivery or polling update
            await expect(async () => {
                const count = await notificationPage.getUnreadCount();
                console.log(`>>> Current Unread Count: ${count}`);
                expect(count).toBeGreaterThan(0);
            }).toPass({ timeout: 15000 });
            console.log('>>> Step 3: Inspecting notification drawer');
            await notificationPage.openNotificationDrawer();
            await notificationPage.verifyNotificationExists(testTitle);
            console.log('>>> Step 4: Marking notification as read');
            await notificationPage.markNotificationAsRead(testTitle);
            console.log('>>> Step 5: Verifying read status persistence');
            // Refresh page to ensure state is saved in DB
            await page.reload();
            await page.waitForLoadState('networkidle');
            await notificationPage.openNotificationDrawer();
            await notificationPage.expectNotificationRead(testTitle);
            await notificationPage.closeNotificationDrawer();
            console.log('>>> Notification workflow verified successfully!');
        }
        finally {
            await deleteNotification(request, createdId);
        }
    });
    test('Notification: Long Content and UI Stability', async ({ request }) => {
        const testTitle = `Looong_Title_${Date.now()}`;
        const testMessage = 'A'.repeat(500) + ' [END]'; // Very long content
        console.log('>>> Step 1: Creating long notification');
        const longRes = await request.post(`${API_BASE}/notifications`, {
            headers: { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
            data: { notiTtlNm: testTitle, notiCn: testMessage, rcvrId: 'webmaster' }
        });
        const longId = await createdNotificationId(longRes);
        try {
            console.log('>>> Step 2: Verifying UI stability in drawer');
            await notificationPage.openNotificationDrawer();
            // 화면에서 말줄임되더라도 접근 가능한 제목과 카드 상태 계약은 전체 제목을 유지한다.
            const partialTitle = testTitle.substring(0, 15);
            const notificationItem = notificationPage.getUnreadNotificationCard(new RegExp(partialTitle));
            await expect(notificationItem).toBeVisible({ timeout: 10000 });
            // Verify content is visible
            const contentLocator = notificationItem.locator('p');
            await expect(contentLocator).toBeVisible();
            const contentText = await contentLocator.textContent();
            expect(contentText?.length).toBeGreaterThan(50);
            // 종전 LayoutBreathingGuard는 임의 보정계수로 밀도를 계산한 뒤 경고만 남겨 항상 green이었다.
            // 긴 단어가 실제 카드 폭을 넘지 않는다는 사용자 관찰 가능 계약을 직접 검증한다.
            const { scrollWidth, clientWidth } = await notificationItem.evaluate((element) => ({
                scrollWidth: element.scrollWidth,
                clientWidth: element.clientWidth,
            }));
            expect(scrollWidth, `긴 알림이 카드 너비를 넘침 (scrollWidth=${scrollWidth}, clientWidth=${clientWidth})`).toBeLessThanOrEqual(clientWidth + 1);
            await notificationPage.closeNotificationDrawer();
        }
        finally {
            await deleteNotification(request, longId);
        }
    });
    test('Notification: Hub Search and Filter Verification', async ({ request, page }) => {
        // [E2E 감사 B] isVisible 가드 + count>=0(수학적 항상참) 제거 —
        // 고유 태그 알림을 seed한 뒤 검색해 실제로 필터링되어 노출되는지 단언한다.
        // [2026-11-10] 검색·읽음 조건이 결과를 실제로 바꾸는지 본다. 종전에는 seed 한 알림(가장 최근)이 보이는지만 봐서, 거르지
        //   않아도 첫 쪽에 있는 그 알림으로 통과했다. 이제 태그가 다른 알림이 검색 뒤 빠지고, 읽은 알림이 '읽지 않은 알림' 에서
        //   빠지는 것을 그 조건으로 다시 읽은 서버 응답과 함께 확인한다.
        const uniqueTag = `HubSearch_${Date.now()}`;
        const unreadTitle = `${uniqueTag}_unread`;
        const seenTitle = `${uniqueTag}_seen`;
        const otherTitle = `HubOther_${Date.now()}`;
        const headers = { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' };
        const seedIds: unknown[] = [];
        const seed = async (title: string) => {
            const seedRes = await request.post(`${API_BASE}/notifications`, {
                headers,
                data: { notiTtlNm: title, notiCn: 'Hub search filter validation payload.', readYn: 'N', rcvrId: 'webmaster' }
            });
            expect(seedRes.ok(), `알림 seed 실패: ${seedRes.status()}`).toBeTruthy();
            const id = await createdNotificationId(seedRes);
            seedIds.push(id);
            return id;
        };
        // seed 는 열린 홈의 머리글 알림에 실시간으로 닿아 재조회를 부를 수 있다 — 그 조회가 끝난 뒤 홈을 떠난다.
        const homeApi = trackApiRequests(page);
        try {
            await seed(unreadTitle);
            const seenId = await seed(seenTitle);
            await seed(otherTitle);
            const read = await request.post(`${API_BASE}/notifications/${seenId}/read`, { headers });
            expect(read.ok(), `알림 읽음 처리 실패: ${read.status()}`).toBeTruthy();
            await homeApi.settled(page.getByRole('heading', { level: 1, name: '업무 홈' }));
            console.log('>>> Navigating to Notification Hub');
            const api = trackApiRequests(page);
            await page.goto('/admin/notifications');
            const heading = page.getByRole('heading', { level: 1, name: '알림 센터' });
            await expect(heading).toBeVisible({ timeout: 15000 });
            const rows = page.getByRole('table', { name: '받은 알림 목록' }).getByRole('row');
            // 거르기 전에는 셋 다 첫 쪽에 있다(받은 순서의 최신이다).
            for (const title of [unreadTitle, seenTitle, otherTitle]) {
                await expect(rows.filter({ hasText: title })).toHaveCount(1, { timeout: 15000 });
            }
            const searchInput = page.getByLabel('알림 검색어');
            await waitForHydration(searchInput);
            await searchInput.fill(uniqueTag);
            await Promise.all([
                page.waitForResponse(response => listedWith(response.url(), { searchWrd: uniqueTag, readYn: null }) && response.ok()),
                searchInput.press('Enter'),
            ]);
            // 검색 결과에 seed한 항목이 반드시 나타나야 하고, 태그가 다른 알림은 빠진다.
            await expect(rows.filter({ hasText: unreadTitle })).toHaveCount(1);
            await expect(rows.filter({ hasText: seenTitle })).toHaveCount(1);
            await expect(rows.filter({ hasText: otherTitle })).toHaveCount(0);
            // 읽음 조건 — '읽지 않은 알림' 은 서버에 readYn=N 으로 다시 묻고, 읽은 알림은 빠진다.
            const readFilter = page.getByRole('group', { name: '읽음 조건' });
            await Promise.all([
                page.waitForResponse(response => listedWith(response.url(), { searchWrd: uniqueTag, readYn: 'N' }) && response.ok()),
                readFilter.getByRole('button', { name: /^읽지 않은 알림/ }).click(),
            ]);
            await expect(readFilter.getByRole('button', { name: /^읽지 않은 알림/ })).toHaveAttribute('aria-pressed', 'true');
            await expect(rows.filter({ hasText: unreadTitle })).toHaveCount(1);
            await expect(rows.filter({ hasText: seenTitle })).toHaveCount(0);
            // '전체 알림' 으로 돌아가면 읽은 알림이 다시 보인다(같은 조건의 앞선 응답을 다시 쓴다 — 조회 캐시 60초).
            await readFilter.getByRole('button', { name: '전체 알림', exact: true }).click();
            await expect(rows.filter({ hasText: seenTitle })).toHaveCount(1);
            await api.settled(heading);
        }
        finally {
            await page.goto('about:blank');
            for (const id of seedIds) await deleteNotification(request, id);
        }
    });
    /*
     * [2026-11-10] 관리자 발송(DEC-OPS-042) — 화면에서 수신자를 고르고 보내면 서버가 수신자마다 알림을 만든다. 수신자는 일반 사용자
     * (TEST1)이고, 그 사람의 알림함은 그 사람의 자격(userRequest)으로 읽는다. 수신자 로그인을 새로 하지 않는다(공유 세션 보존).
     */
    test('Notification: 관리자가 화면에서 보낸 알림이 수신자 알림함에 남는다', async ({ page, userRequest }) => {
        const meRes = await userRequest.get('/api/v1/users/me');
        expect(meRes.status(), '수신자 프로필 조회').toBe(200);
        const recipient = (await meRes.json()).data as { esntlId: string; userNm: string };
        expect(recipient.esntlId).toBeTruthy();
        expect(recipient.userNm?.length ?? 0, '수신자 찾기는 이름 두 글자 이상으로 찾는다').toBeGreaterThanOrEqual(2);
        const title = `E2E_Dispatch_${Date.now()}`;
        const inbox = async () => {
            const response = await userRequest.get('/api/v1/notifications', { params: { searchWrd: title, page: 1, size: 10 } });
            expect(response.status(), '수신자 알림함 조회').toBe(200);
            return ((await response.json()).data?.list ?? []) as { notiSn: number; notiTtlNm: string }[];
        };
        try {
            await page.goto('/admin/notifications');
            await expect(page.getByRole('heading', { level: 1, name: '알림 센터' })).toBeVisible({ timeout: 15000 });
            await page.getByRole('button', { name: '알림 보내기', exact: true }).click();
            const dialog = page.getByRole('dialog', { name: '알림 보내기' });
            await expect(dialog).toBeVisible();
            await dialog.getByRole('button', { name: '수신자 찾기', exact: true }).click();
            const picker = page.getByRole('dialog', { name: '알림 수신자 찾기' });
            await picker.getByLabel('사용자 검색어 입력').fill(recipient.userNm);
            await picker.getByRole('button', { name: '검색', exact: true }).click();
            // 같은 이름의 다른 계정이 있어도 수신자의 내부 식별자로 그 사람을 고른다.
            await picker.getByRole('checkbox', { name: `${recipient.userNm} 선택`, exact: true })
                .and(picker.locator(`[id="recipient-user-${recipient.esntlId}"]`))
                .check();
            await picker.getByRole('button', { name: /^선택 추가/ }).click();
            await expect(picker).toBeHidden();
            await expect(dialog.getByRole('list', { name: '선택된 수신자' })).toContainText(recipient.userNm);
            await dialog.getByRole('textbox', { name: '제목 (필수)', exact: true }).fill(title);
            await dialog.getByRole('textbox', { name: '내용 (필수)', exact: true }).fill('관리자 화면 발송 여정이 보낸 알림입니다.');
            const [dispatched] = await Promise.all([
                page.waitForResponse(response => new URL(response.url()).pathname === '/api/v1/admin/notifications/dispatch'
                    && response.request().method() === 'POST'),
                dialog.getByRole('button', { name: '알림 보내기 (1명)', exact: true }).click(),
            ]);
            expect(dispatched.status(), '알림 발송').toBe(200);
            expect((await dispatched.json()).data, '한 명에게 보냈다').toBe(1);
            await expect(dialog).toBeHidden();
            // 수신자의 알림함에 정확히 그 알림 하나가 있다.
            await expect.poll(async () => (await inbox()).map(item => item.notiTtlNm), { timeout: 15000 }).toEqual([title]);
        }
        finally {
            for (const item of await inbox()) {
                const removed = await userRequest.delete(`/api/v1/notifications/${item.notiSn}`);
                expect(removed.status(), '수신자 알림 정리').toBe(200);
            }
        }
    });
});

/** 알림 센터 목록 조회의 조건이 기대와 같은가. readYn 이 null 이면 읽음 조건 없이(전체) 물은 조회다. */
function listedWith(url: string, expected: { searchWrd: string; readYn: string | null }): boolean {
    const parsed = new URL(url);
    return parsed.pathname === '/api/v1/notifications'
        && parsed.searchParams.get('searchWrd') === expected.searchWrd
        && parsed.searchParams.get('readYn') === expected.readYn;
}
