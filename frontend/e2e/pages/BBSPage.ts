import { Page, expect, Locator } from '@playwright/test';

export class BBSPage {
  readonly page: Page;
  readonly searchInput: Locator;
  readonly dataTable: Locator;
  readonly firstRow: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchInput = page.locator('input[placeholder*="검색"], input[type="text"], [role="searchbox"]').first();
    // Generalized selector for standard data tables in the project
    this.dataTable = page.locator('table, .bbs-list, [role="grid"], [role="article"], .stream-item, :text-matches("게시글이 존재하지 않습니다|데이터가 없습니다", "i")').first();
    this.firstRow = page.locator('table tbody tr').first();
  }

  async goto(bbsId: string = 'BBSMSTR_AAAAAAAAAAAA') {
    await this.page.goto(`/admin/community/boards?bbsId=${bbsId}`, { waitUntil: 'networkidle' });
  }

  async search(keyword: string) {
    if (await this.searchInput.isVisible()) {
      await this.searchInput.fill(keyword);
      await this.page.keyboard.press('Enter');
      // Intelligent wait: wait for specific API response related to board lists
      await this.page.waitForResponse(response => 
        response.url().includes('/selectBoardList') && response.status() === 200
      );
    }
  }

  async clickFirstRow() {
    await expect(this.firstRow).toBeVisible({ timeout: 15000 });
    await this.firstRow.click();
    // Wait for detail view navigation
    await this.page.waitForLoadState('networkidle');
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
