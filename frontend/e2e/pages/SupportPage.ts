import { Page, expect } from '@playwright/test';

export class SupportPage {
    constructor(private page: Page) {}

    async gotoManuals() {
        console.log('>>> [Support] Navigating to Online Manuals');
        await this.page.goto('/admin/uss/olh/online-manual');
        await expect(this.page.getByRole('heading', { name: /온라인 도움말 관리/i })).toBeVisible({ timeout: 15000 });
    }

    async createManual(title: string, content: string) {
        console.log(`>>> [Support] Creating manual: ${title}`);
        await this.page.getByRole('button', { name: /신규 등록/i }).click();
        
        await this.page.getByPlaceholder(/도움말 명칭/i).fill(title);
        // Assuming Tiptap editor
        const editor = this.page.locator('.ProseMirror');
        if (await editor.isVisible()) {
            await editor.fill(content);
        } else {
            await this.page.getByPlaceholder(/도움말 내용/i).fill(content);
        }

        await this.page.getByRole('button', { name: /저장/i }).click();
        await expect(this.page.getByRole('alert').filter({ hasText: /성공|저장/i })).toBeVisible({ timeout: 20000 });
    }

    async searchManual(keyword: string) {
        const searchInput = this.page.locator('input[placeholder*="검색"]').first();
        await searchInput.fill(keyword);
        await this.page.keyboard.press('Enter');
        await this.page.waitForTimeout(2000);
    }
}
