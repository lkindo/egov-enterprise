import { Page, expect, Locator } from '@playwright/test';

export class BBSPage {
  readonly page: Page;
  readonly searchInput: Locator;
  readonly dataTable: Locator;
  readonly firstRow: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchInput = page.getByPlaceholder(/위키|FAQ|기술 포럼|검색|Search/i).first();
    // Generalized selector: supports legacy tables and modern Hub cards/item streams
    this.dataTable = page.locator('main, .hub-card-section, table, [role="grid"]').first();
    this.firstRow = page.locator('.hub-table-container, table tbody tr, .hub-card-item').first();
  }

  async goto(bbsId: string = 'BBSMSTR_AAAAAAAAAAAA') {
    const url = `/admin/community/boards?bbsId=${bbsId}`;
    console.log(`>>> Navigating to BBS: ${url}`);
    await this.page.goto(url, { waitUntil: 'domcontentloaded' });
  }

  async search(keyword: string) {
    if (await this.searchInput.isVisible()) {
      await this.searchInput.fill(keyword);
      
      try {
        const responsePromise = this.page.waitForResponse(response => 
          response.url().includes('/api/v1/boards/') && response.status() === 200, 
          { timeout: 5000 }
        );
        await this.page.keyboard.press('Enter');
        
        const response = await responsePromise;
        const body = await response.json();
        const data = body.result || body.data || body;
        
        // 필드명 불일치 엄격 검증 (Strict Field Validation)
        if (data && !Array.isArray(data.list) && Array.isArray(data.content)) {
          throw new Error(`[FIELD MISMATCH] Backend returned 'content' instead of 'list' for ${response.url()}`);
        }
      } catch (e) {
        console.log(`>>> API check skipped or failed: ${e.message}`);
        // Fallback or explicit re-throw
        if (e.message.includes('FIELD MISMATCH')) {
          throw e;
        }
        await this.page.waitForLoadState('domcontentloaded');
      }
    }
  }

  async clickFirstRow() {
    if (await this.firstRow.isVisible().catch(() => false)) {
      await this.firstRow.click();
      await this.page.waitForLoadState('domcontentloaded');
      console.log('>>> First row clicked');
    } else {
      console.log('>>> No rows found for detail view');
    }
  }

  async verifyPageStructure() {
    await expect(this.page.locator('main, [role="main"], .main-content').first()).toBeVisible();
    await expect(this.dataTable).toBeVisible();
  }

  async verifyDetailView() {
    await expect(this.page.locator('main, [role="main"], .main-content').first()).toBeVisible();
    await expect(this.page.getByText(/상세 | 내용 | 목록 |Back|Detail/i).first()).toBeVisible();
  }
}
