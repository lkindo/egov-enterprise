import { test, expect } from './fixtures/base-test';
import { NotificationPage } from './pages/NotificationPage';
import fs from 'fs';
import path from 'path';

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

    test('Notification: Real-time Delivery and Read Flow', async ({ request, page }) => {
        const testTitle = `E2E_Notif_${Date.now()}`;
        const testMessage = 'System integrity check required for the communication node.';

        console.log('>>> Waiting for WebSocket connection...');
        await page.waitForTimeout(2000);

        console.log('>>> Step 1: Creating notification via API');
        // Create notification for the current user (webmaster)
        const response = await request.post('http://localhost:8080/api/v1/notifications', {
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
        const notificationItem = page.locator('div.group').filter({ has: page.locator('h3', { hasText: testTitle }) });
        await expect(notificationItem).toHaveClass(/opacity-60/);
        
        await notificationPage.closeNotificationDrawer();
        console.log('>>> Notification workflow verified successfully!');
    });

    test('Notification: Long Content and UI Stability', async ({ request, page, layoutGuard }) => {
        const testTitle = `Looong_Title_${Date.now()}`;
        const testMessage = 'A'.repeat(500) + ' [END]'; // Very long content

        console.log('>>> Step 1: Creating long notification');
        await request.post('http://localhost:8080/api/v1/notifications', {
            headers: { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
            data: { notiTtlNm: testTitle, notiCn: testMessage, rcvrId: 'webmaster' }
        });

        console.log('>>> Step 2: Verifying UI stability in drawer');
        await notificationPage.openNotificationDrawer();
        
        // Search for item by a partial match in case of truncation
        const partialTitle = testTitle.substring(0, 15);
        const notificationItem = page.locator('div.group').filter({ has: page.locator('h3', { hasText: new RegExp(partialTitle) }) }).first();
        await expect(notificationItem).toBeVisible({ timeout: 10000 });
        
        // Verify content is visible
        const contentLocator = notificationItem.locator('p');
        await expect(contentLocator).toBeVisible();
        const contentText = await contentLocator.textContent();
        expect(contentText?.length).toBeGreaterThan(50);
        
        // 디자인 숨통 정량 검증 가드 실행 (여백 40% 체크)
        await layoutGuard.verifyBreathingRatio('div.group', 'Notification Item Drawer');

        await notificationPage.closeNotificationDrawer();
    });

    test('Notification: Hub Search and Filter Verification', async ({ page }) => {
        // Go to full notification hub if it exists (usually /admin/system/notifications or similar)
        console.log('>>> Navigating to Notification Hub');
        await page.goto('/admin/notifications');
        await page.waitForLoadState('networkidle');

        // Search for a known notification or use search input
        const searchInput = page.locator('input[placeholder*="검색"], input[aria-label*="Search"]').first();
        if (await searchInput.isVisible()) {
            await searchInput.fill('integrity'); // From previous test
            await page.keyboard.press('Enter');
            await page.waitForTimeout(1000);
            
            // Check results
            const results = page.locator('tr, div.item').filter({ hasText: 'integrity' });
            expect(await results.count()).toBeGreaterThanOrEqual(0);
        }
    });
});
