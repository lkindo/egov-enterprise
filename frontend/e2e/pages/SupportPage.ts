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

        // [2026-08-22 정정] 제출 버튼의 접근 이름이 '게시글 저장' → '게시글 등록' 으로 바뀌었다
        //   (BoardRegistClient.tsx:275,285). '등록 완료' 는 메뉴·온라인매뉴얼 화면 문구라 여기엔 없다.
        //   종전 정규식은 전체 문자열 매칭이라 어떤 후보와도 맞지 않아 180초 test timeout 이 났다.
        await this.page.getByRole('button', { name: '게시글 등록', exact: true }).click();
        // 사라지는 토스트 대신 저장 후 착지한 상세 화면을 단언한다(KnowledgePage 와 동일 사유).
        await expect(this.page.getByRole('heading', { name: title, exact: true })).toBeVisible({ timeout: 15000 });
    }
}
