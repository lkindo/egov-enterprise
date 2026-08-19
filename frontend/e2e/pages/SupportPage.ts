import { Page, expect } from '@playwright/test';

export class SupportPage {
    constructor(private page: Page) {}

    async gotoManuals() {
        console.log('>>> [Support] Navigating to Online Manuals');
        await this.page.goto('/admin/uss/olh/online-manual');
        await expect(this.page.getByRole('heading', { name: /온라인 가이드 아키텍처|온라인 매뉴얼/i })).toBeVisible({ timeout: 15000 });
    }

    async gotoFAQ() {
        console.log('>>> [Support] Navigating to FAQ Hub');
        await this.page.goto('/admin/help/faq');
        await expect(this.page.getByText(/지식 매트릭스|Knowledge Hub/i).first()).toBeVisible({ timeout: 15000 });
    }

    async gotoQna() {
        console.log('>>> [Support] Navigating to Q&A Hub');
        await this.page.goto('/admin/help/qna');
        await expect(this.page.getByText(/지식 매트릭스|Knowledge Hub/i).first()).toBeVisible({ timeout: 15000 });
    }

    async createManual(title: string, content: string) {
        console.log(`>>> [Support] Creating manual: ${title}`);
        await this.page.getByRole('button', { name: /새 매뉴얼 등록/i }).click();
        
        await this.page.getByPlaceholder(/매뉴얼 명을 입력하세요/i).fill(title);
        await this.page.getByPlaceholder(/매뉴얼 설명을 입력하세요/i).fill(content);
        await this.page.getByPlaceholder(/\/src\/docs\/manuals/i).fill('/e2e/test/path');
        
        await this.page.getByRole('button', { name: /등록 완료/i }).click();
        await expect(this.page.getByText(/새 매뉴얼을 등록했습니다/i)).toBeVisible();
    }

    async updateManual(oldTitle: string, newTitle: string) {
        const row = this.page.locator('tr').filter({ hasText: oldTitle });
        await row.getByRole('button').filter({ has: this.page.locator('svg') }).first().click(); // Edit button has Edit2 icon
        
        await this.page.getByPlaceholder(/매뉴얼 명을 입력하세요/i).fill(newTitle);
        await this.page.getByRole('button', { name: /수정 완료/i }).click();
        await expect(this.page.getByText(/매뉴얼 정보를 수정했습니다/i)).toBeVisible();
    }

    async deleteManual(title: string) {
        this.page.once('dialog', dialog => dialog.accept());
        const row = this.page.locator('tr').filter({ hasText: title });
        await row.getByRole('button').filter({ has: this.page.locator('svg') }).last().click(); // Trash icon is usually last
        
        await expect(this.page.getByText(/매뉴얼을 삭제했습니다/i)).toBeVisible();
    }

    async searchManual(keyword: string) {
        const searchInput = this.page.locator('input[placeholder*="검색"]').first();
        await searchInput.fill(keyword);
        await this.page.keyboard.press('Enter');
        await expect(searchInput).toHaveValue(keyword);
    }

    async createKnowledgeEntry(title: string, content: string) {
        console.log(`>>> [Support] Creating Knowledge Entry: ${title}`);
        await this.page.getByRole('button', { name: /신규 등록/i }).click();
        
        const titleInput = this.page.locator('input[name="pstTtl"]').first();
        await titleInput.waitFor({ state: 'visible' });
        await titleInput.click();
        await titleInput.fill(title);
        await expect(titleInput).toHaveValue(title);
        await titleInput.press('Tab'); // Trigger blur and react-hook-form change validation

        const editor = this.page.locator('.tiptap[contenteditable="true"], .ProseMirror, [contenteditable="true"], textarea').last();
        await editor.waitFor({ state: 'visible' });
        await editor.click();
        await this.page.keyboard.type(content);
        await expect(editor).toContainText(content);

        await this.page.getByRole('button', { name: /등록 완료|저장|Commit/i }).click();
        await expect(this.page.getByText(/성공|완료|등록되었습니다/i)).toBeVisible({ timeout: 15000 });
    }
}
