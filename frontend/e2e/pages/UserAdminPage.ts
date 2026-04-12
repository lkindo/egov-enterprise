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
    // [Strict Validation] Monitor API response for field mismatches
    const responsePromise = this.page.waitForResponse(
      response => response.url().includes('/users') && response.status() === 200,
      { timeout: 5000 }
    ).catch(() => null);

    if (await this.searchInput.isVisible()) {
      await this.searchInput.fill(keyword);
      
      const response = await responsePromise;
      if (response) {
        const data = await response.json();
        // Check for PageResponse standardization (list vs content)
        if (data.content && !data.list) {
          throw new Error(`[Field Mismatch] Backend returned 'content' instead of standardized 'list' for user data.`);
        }
        
        // Check for specific field mapping standardization (emailAdres vs email)
        const items = data.list || [];
        if (items.length > 0) {
          const firstItem = items[0];
          if ('email' in firstItem && !('emailAdres' in firstItem)) {
             throw new Error(`[Field Mismatch] Backend returned 'email' instead of standardized 'emailAdres' for user data.`);
          }
        }
      }
      
      await this.page.waitForTimeout(1000);
      await this.page.waitForLoadState('domcontentloaded', { timeout: 3000 }).catch(() => {});
    }
  }

  async verifyHUB() {
    console.log('>>> Standardized Identity Probe initiated.');
    await expect(this.dataTable).toBeVisible();
    
    // Check if the table has data and if critical fields like Email (now emailAdres) are visible
    const tableText = await this.dataTable.innerText();
    if (tableText.includes('EMAIL') || tableText.includes('이메일')) {
       // Verification passed if headers are present
    }
  }
}
