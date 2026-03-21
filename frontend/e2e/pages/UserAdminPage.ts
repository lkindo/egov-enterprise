import { Page, expect, Locator } from '@playwright/test';

export class UserAdminPage {
  readonly page: Page;
  readonly searchInput: Locator;
  readonly dataTable: Locator;
  readonly firstRow: Locator;
  readonly provisionButton: Locator;

  constructor(page: Page) {
    this.page = page;
    // Matching UserManageClient.tsx
    this.searchInput = page.getByPlaceholder(/사용자명 또는 고유 ID/i);
    this.dataTable = page.locator('.hub-card-section, table, [role="grid"]').first();
    this.firstRow = page.locator('.hub-table-container, table tbody tr').first();
    this.provisionButton = page.getByRole('button', { name: /신규 멤버 프로비저닝/i });
  }

  async goto() {
    await this.page.goto('/admin/user/manage', { waitUntil: 'networkidle' });
  }

  async search(keyword: string) {
    if (await this.searchInput.isVisible()) {
      await this.searchInput.fill(keyword);
      // Wait for network refresh or short delay for local mock data
      await this.page.waitForTimeout(1000);
      await this.page.waitForLoadState('networkidle', { timeout: 3000 }).catch(() => {});
    }
  }

  async verifyHUB() {
    await expect(this.page.getByText(/Identity Fabric|사용자 인증 거버넌스/i)).toBeVisible();
    await expect(this.dataTable).toBeVisible();
  }
}
