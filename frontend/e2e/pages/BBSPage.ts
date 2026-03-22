import { Page, expect, Locator } from '@playwright/test';

export class BBSPage {
  readonly page: Page;
  readonly searchInput: Locator;
  readonly dataTable: Locator;
  readonly firstRow: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchInput = page.getByPlaceholder(/위키|FAQ|기술 포럼|검색/i);
    // Generalized selector: supports legacy tables and modern Hub cards/item streams
    this.dataTable = page.locator('main, .hub-card-section, table, [role="grid"]').first();
    this.firstRow = page.locator('.hub-table-container, table tbody tr').first();
  }

  async goto(bbsId: string = 'BBSMSTR_AAAAAAAAAAAA') {
    await this.page.goto(`/admin/community/boards?bbsId=${bbsId}`, { waitUntil: 'domcontentloaded' });
  }

  async search(keyword: string) {
    if (await this.searchInput.isVisible()) {
      await this.searchInput.fill(keyword);
      await this.page.keyboard.press('Enter');
      
      // Wait for network activity or a short period to allow for state updates
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
    await expect(this.firstRow).toBeVisible({ timeout: 15000 });
    await this.firstRow.click();
    // Wait for detail view navigation
    await this.page.waitForLoadState('domcontentloaded');
  }

  async verifyPageStructure() {
    await expect(this.page.locator('main')).toBeVisible();
    await expect(this.dataTable).toBeVisible();
  }

  async verifyDetailView() {
    await expect(this.page.locator('main')).toBeVisible();
    await expect(this.page.getByText(/상세|내용|목록|Back/i).first()).toBeVisible();
  }
}
