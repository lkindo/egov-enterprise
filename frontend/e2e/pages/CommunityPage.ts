import { Page, expect } from '@playwright/test';

export class CommunityPage {
    constructor(private page: Page) {}

    async goto() {
        console.log('>>> [Community] Navigating to Community Matrix');
        await this.page.goto('/admin/community');
        await expect(this.page.getByRole('heading', { name: /엔터프라이즈 지식 매트릭스/i })).toBeVisible({ timeout: 15000 });
    }

    async selectCategory(category: 'WIKI' | 'FAQ' | 'QNA' | 'COMMUNITY') {
        const categoryMap: Record<string, string> = {
            'WIKI': 'Global Wiki',
            'FAQ': '고객지원',
            'QNA': '기술 Q&A',
            'COMMUNITY': '커뮤니티'
        };
        console.log(`>>> [Community] Selecting category: ${category}`);
        await this.page.getByRole('button', { name: categoryMap[category] }).click();
        await this.page.waitForTimeout(1000);
    }

    async verifyCOPList() {
        console.log('>>> [Community] Verifying COP (Community) List');
        await this.selectCategory('COMMUNITY');
        await expect(this.page.locator('button:has-text("신규 등록")')).toBeVisible();
        
        // Check for "커뮤니티" specific items if any
        const articles = this.page.locator('button.group');
        const count = await articles.count();
        console.log(`>>> Found ${count} community units.`);
    }

    async gotoMaster() {
        console.log('>>> [Community] Navigating to Community Master Console');
        await this.page.getByRole('button', { name: /Master Console/i }).click();
        await expect(this.page).toHaveURL(/\/admin\/community\/boards\/master/);
    }
}
