import { test, expect } from './fixtures/base-test';
import type { APIRequestContext, APIResponse } from '@playwright/test';
import { NotificationPage } from './pages/NotificationPage';
import fs from 'fs';
import path from 'path';

// [2026-07-28 정정] 백엔드 주소를 세 곳에 하드코딩하고 있었다. auth.setup.ts·cleanup-db.ts 는 이미
//   `process.env.NEXT_PUBLIC_API_URL || 기본값` 패턴을 쓰는데 이 파일만 예외였다. 백엔드를 다른
//   포트에 띄우면 시드 POST 가 엉뚱한 서비스로 새어 알림이 생성되지 않고, 그 뒤 UI 단언이 전부
//   무너진다(실측 3건 red). 저장소 표준 패턴에 맞춘다.
const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1').replace(/\/$/, '');

test.describe('Tier 12: Notification & Communication Intelligence', () => {
    test.use({ storageState: path.join(__dirname, '..', 'playwright', '.auth', 'admin.json') });
    let notificationPage: NotificationPage;
    let adminToken: string;

    test.beforeAll(async () => {
        // Load admin token for API calls
        const authPath = path.join(__dirname, '..', 'playwright', '.auth', 'admin.json');
        console.log(`>>> Loading auth from: ${authPath}`);
        if (fs.existsSync(authPath)) {
            const authData = JSON.parse(fs.readFileSync(authPath, 'utf-8'));
            adminToken = authData.cookies.find((c: any) => c.name === 'accessToken')?.value;
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
        if (notiSn === undefined || notiSn === null || notiSn === '') return;
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
        } catch {
            return null;
        }
    }

    test('Notification: Real-time Delivery and Read Flow', async ({ request, page }) => {
        const testTitle = `E2E_Notif_${Date.now()}`;
        const testMessage = 'System integrity check required for the communication node.';

        console.log('>>> Waiting for WebSocket connection...');
        // [2026-08-22 정정] 연결 상태 문구가 '실시간 연결됨' 단일 값에서
        //   `!isConnected ? '연결 끊김' : stats ? '통계 수신 중' : '통계 수신 대기 중'`
        //   (RealTimeDashboard.tsx:137)로 바뀌었다 — 연결됨이 두 하위 상태로 갈라졌다.
        //   둘 다 "연결됨"이므로 모두 수용해야 한다. 하나만 단언하면 stats 도착 타이밍에 flaky 가 된다.
        //   ('연결 끊김' 은 여전히 매칭되지 않으므로 미연결을 통과시키지 않는다.)
        await expect(page.getByText(/통계 수신 (중|대기 중)/)).toBeVisible({ timeout: 15000 });

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
        } finally {
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
        expect(
            scrollWidth,
            `긴 알림이 카드 너비를 넘침 (scrollWidth=${scrollWidth}, clientWidth=${clientWidth})`,
        ).toBeLessThanOrEqual(clientWidth + 1);

        await notificationPage.closeNotificationDrawer();
        } finally {
            await deleteNotification(request, longId);
        }
    });

    test('Notification: Hub Search and Filter Verification', async ({ request, page }) => {
        // [E2E 감사 B] isVisible 가드 + count>=0(수학적 항상참) 제거 —
        // 고유 태그 알림을 seed한 뒤 검색해 실제로 필터링되어 노출되는지 단언한다.
        const uniqueTag = `HubSearch_${Date.now()}`;
        const seedRes = await request.post(`${API_BASE}/notifications`, {
            headers: { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
            data: { notiTtlNm: uniqueTag, notiCn: 'Hub search filter validation payload.', readYn: 'N', rcvrId: 'webmaster' }
        });
        expect(seedRes.ok(), `알림 seed 실패: ${seedRes.status()}`).toBeTruthy();
        const seedId = await createdNotificationId(seedRes);

        try {
        console.log('>>> Navigating to Notification Hub');
        await page.goto('/admin/notifications');
        await page.waitForLoadState('networkidle');

        const searchInput = page.locator('input[placeholder*="검색"], input[aria-label*="Search"]').first();
        await expect(searchInput).toBeVisible({ timeout: 15000 });
        await searchInput.fill(uniqueTag);
        await page.keyboard.press('Enter');

        // 검색 결과에 seed한 항목이 반드시 나타나야 한다.
        await expect(page.getByText(uniqueTag).first()).toBeVisible({ timeout: 15000 });
        } finally {
            await deleteNotification(request, seedId);
        }
    });
});
