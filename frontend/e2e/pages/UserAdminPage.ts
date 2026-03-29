import { Page, expect, Locator } from '@playwright/test';

export class UserAdminPage {
  readonly page: Page;
  readonly searchInput: Locator;
  readonly dataTable: Locator;
  readonly firstRow: Locator;
  readonly provisionButton: Locator;
  readonly addUserButton: Locator;

  constructor(page: Page) {
    this.page = page;
    // Flexible selectors for user management
    this.searchInput = page.getByPlaceholder(/Probing for identity|사용자명|고유 ID|Search|ID|Name/i).first();
    this.addUserButton = page.getByRole('button', { name: /MEMBER_PROVISION|등록|추가|Add/i }).first();
    this.dataTable = page.locator('.hub-card-section, table, [role="grid"], main').first();
    this.firstRow = page.locator('.hub-table-container, table tbody tr, .hub-card-item').first();
    this.provisionButton = page.getByRole('button', { name: /신규 | 멤버 | 프로비저닝|Provision|New|Add/i }).first();
  }

  async goto() {
    await this.page.goto('/admin/user/manage', { waitUntil: 'domcontentloaded' });
  }

  async search(keyword: string) {
    if (await this.searchInput.isVisible()) {
      await this.searchInput.fill(keyword);
      await this.page.waitForTimeout(1000);
      await this.page.waitForLoadState('domcontentloaded', { timeout: 3000 }).catch(() => {});
    }
  }

  async verifyHUB() {
    // Flexible verification - check for any user-related content
    const pageContent = await this.page.content();
    const hasUserContent = pageContent.includes('user') || 
                           pageContent.includes('User') || 
                           pageContent.includes('사용자') ||
                           pageContent.includes('MEMBER') ||
                           pageContent.includes('Identity');
    
    if (hasUserContent) {
      console.log('>>> User management HUB verified');
    }
    await expect(this.dataTable).toBeVisible();
  }
}
