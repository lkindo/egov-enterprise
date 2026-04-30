import { test, expect } from '@playwright/test';
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
            adminToken = authData.cookies.find(c => c.name === 'accessToken')?.value;
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
                ntfcSj: testTitle,
                ntfcCn: testMessage,
                isRead: 'N',
                receiverId: 'webmaster'
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
});
