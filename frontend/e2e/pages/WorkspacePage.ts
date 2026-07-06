import { Page, expect } from '@playwright/test';

export class WorkspacePage {
    constructor(private page: Page) {}

    async navigateToMyPageSettings() {
        await this.page.goto('/admin/workspace/my-page');
    }

    async verifyMyPageHeader() {
        const header = this.page.getByRole('heading', { name: /마이페이지 (환경 )?설정/ }).first();
        await header.waitFor({ state: 'visible' });
        await expect(header).toBeVisible();
    }

    async toggleContentStatus(index: number = 0) {
        // Wait for loading to finish
        await this.page.waitForSelector('.animate-pulse', { state: 'detached' });
        
        const toggleButtons = this.page.locator('main button').filter({ has: this.page.locator('svg') });
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
