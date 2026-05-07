import { Page, expect } from '@playwright/test';

export class NotificationPage {
    constructor(private page: Page) {}

    async openNotificationDrawer() {
        const bellButton = this.page.locator('#e2e-bell-button');
        await bellButton.click();
        
        // Wait for drawer to appear and finish animation
        const drawer = this.page.locator('[class*="z-\\[9999\\]"]').last();
        await expect(drawer).toBeVisible({ timeout: 15000 });
        
        // Wait for the header to be visible which indicates the drawer content is rendering
        await expect(drawer.locator('h2')).toContainText(/Alert Sentinel/i, { timeout: 10000 });
        
        // Wait for at least one notification item or the "No active alerts" message
        // Use a more specific selector to avoid hidden elements
        await drawer.locator('div.group, span:has-text("No active alerts")').first().waitFor({ state: 'visible', timeout: 15000 });
    }

    async closeNotificationDrawer() {
        const closeButton = this.page.getByTestId('e2e-drawer-close');
        await closeButton.click();
        // Wait for drawer to animate out
        await this.page.locator('[data-testid="e2e-drawer-close"]').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    }

    async getUnreadCount(): Promise<number> {
        // More robust badge check: any dot or number inside the bell button container
        const badge = this.page.locator('#e2e-bell-button').locator('.notification-badge, [data-slot="badge"], .bg-red-500, .bg-rose-500, .bg-destructive').first();
        if (await badge.isVisible()) {
            const text = await badge.innerText();
            if (!text || text.trim() === '') return 1; // It's a dot
            return parseInt(text.replace('+', '')) || 0;
        }
        return 0;
    }

    async verifyNotificationExists(title: string) {
        // Wait for the drawer to be stable and the item to appear
        const notificationItem = this.page.locator('div.group h3').filter({ hasText: title }).first();
        await notificationItem.waitFor({ state: 'visible', timeout: 15000 });
        await expect(notificationItem).toBeVisible();
    }

    async markNotificationAsRead(title: string) {
        const notificationItem = this.page.locator('div.group').filter({ has: this.page.locator('h3', { hasText: title }) }).first();
        await notificationItem.click();
        
        // Wait for the opacity-60 class to be applied (visual confirmation of state change)
        await expect(notificationItem).toHaveClass(/opacity-60/, { timeout: 10000 });
        
        // Also wait a bit for the badge count to sync (background update)
        await this.page.waitForTimeout(1000);
    }

    async readAllNotifications() {
        // Use data-testid for stable targeting (bottom sticky button)
        const readAllButton = this.page.getByTestId('read-all-broadcasts-btn');
        await readAllButton.waitFor({ state: 'visible', timeout: 5000 });
        await readAllButton.click();
    }
}
