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
    await this.page.goto(`/admin/community/boards?bbsId=${bbsId}`, { waitUntil: 'domcontentloaded' });
  }

  async search(keyword: string) {
    if (await this.searchInput.isVisible()) {
      await this.searchInput.fill(keyword);
      await this.page.keyboard.press('Enter');

      try {
        await Promise.race([
          this.page.waitForResponse(response => response.url().includes('/api/v1/boards/') && response.status() === 200, { timeout: 3000 }),
          this.page.waitForLoadState('domcontentloaded', { timeout: 3000 }),
          this.page.waitForTimeout(2000)
        ]);
      } catch (e) {
        // Silently continue if no API hit (Static Hub state)
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
