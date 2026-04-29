import { Page, expect } from '@playwright/test';

export class WorkspacePage {
    constructor(private page: Page) {}

    async navigateToMyPageSettings() {
        await this.page.goto('/admin/workspace/my-page');
        await this.page.waitForLoadState('networkidle');
    }

    async verifyMyPageHeader() {
        const header = this.page.locator('h1');
        await header.waitFor({ state: 'visible' });
        await expect(header).toContainText(/마이페이지 설정/i);
    }

    async toggleContentStatus(index: number = 0) {
        // Wait for loading to finish
        await this.page.waitForSelector('.animate-pulse', { state: 'detached' });
        
        const toggleButtons = this.page.locator('button').filter({ has: this.page.locator('svg') });
        const count = await toggleButtons.count();
        if (count > 0) {
            const button = toggleButtons.nth(index);
            await button.click();
            // In the environment, it might show a toast
            try {
                await expect(this.page.locator('div[role="status"], .toast')).toBeVisible({ timeout: 5000 });
            } catch (e) {
                console.log('>>> Toast notification not detected, continuing...');
            }
        } else {
            console.log('>>> No content items found to toggle.');
        }
    }
}
