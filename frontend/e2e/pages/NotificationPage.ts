import { Page, expect } from '@playwright/test';

export class NotificationPage {
    constructor(private page: Page) {}

    async openNotificationDrawer() {
        const bellButton = this.page.locator('#e2e-bell-button');
        await bellButton.click();
        await expect(this.page.locator('h2')).toContainText(/Alert Sentinel/i);
    }

    async closeNotificationDrawer() {
        const closeButton = this.page.getByTestId('e2e-drawer-close');
        await closeButton.click();
        await expect(this.page.locator('h2:has-text("Alert Sentinel")')).not.toBeVisible();
    }

    async getUnreadCount(): Promise<number> {
        // More robust badge check: any dot or number inside the bell button container
        const badge = this.page.locator('#e2e-bell-button').locator('.notification-badge, [data-slot="badge"], .bg-red-500, .bg-destructive').first();
        if (await badge.isVisible()) {
            const text = await badge.innerText();
            if (!text || text.trim() === '') return 1; // It's a dot
            return parseInt(text.replace('+', '')) || 0;
        }
        return 0;
    }

    async verifyNotificationExists(title: string) {
        const notificationItem = this.page.locator('h3').filter({ hasText: title });
        await expect(notificationItem).toBeVisible();
    }

    async markNotificationAsRead(title: string) {
        const notificationItem = this.page.locator('div.group').filter({ has: this.page.locator('h3', { hasText: title }) });
        await notificationItem.click();
        // Give some time for state update and animation
        await this.page.waitForTimeout(1000);
        // After clicking, it should be marked as read (opacity-60 class added)
        await expect(notificationItem).toHaveClass(/opacity-60/);
    }

    async readAllNotifications() {
        const readAllButton = this.page.getByRole('button', { name: /READ_ALL_BROADCASTS/i });
        await readAllButton.click();
    }
}
