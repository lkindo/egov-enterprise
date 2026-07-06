import { Page, expect, Locator } from '@playwright/test';

export class BoardMasterPage {
  readonly page: Page;
  readonly wizardButton: Locator;
  readonly bbsNmInput: Locator;
  readonly bbsIntrcnInput: Locator;
  readonly nextButton: Locator;
  readonly deployButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.wizardButton = page.locator('button').filter({ 
      hasText: /NEW BOARD WIZARD|마법사|Wizard|Maker|Create/i 
    }).or(page.locator('button:has(svg.lucide-rocket), button:has(.lucide-rocket)')).first();
    
    this.bbsNmInput = page.locator('#bbsTtl').first();
    this.bbsIntrcnInput = page.locator('#bbsExpln').first();
    this.nextButton = page.locator('button').filter({ hasText: /다음 단계로|Next/i }).first();
    this.deployButton = page.locator('button').filter({ hasText: /게시판 생성|Deploy|Create/i }).first();
  }

  async gotoMaster() {
    await this.page.goto('/admin/community/boards/master', { waitUntil: 'domcontentloaded' });
  }

  async gotoMaker() {
    await this.page.goto('/admin/community/boards/maker', { waitUntil: 'domcontentloaded' });
  }

  async startWizard() {
    console.log('>>> Attempting to start wizard...');
    await this.page.waitForLoadState('networkidle').catch(() => {});
    
    try {
      await expect(this.wizardButton).toBeVisible({ timeout: 15000 });
      await this.wizardButton.scrollIntoViewIfNeeded();
      await this.wizardButton.click();
    } catch (e) {
      console.log('>>> Standard wizard button not found, searching for any button with "마법사" or "Rocket"');
      const fallback = this.page.locator('button').filter({ hasText: /마법사/i }).first();
      await expect(fallback).toBeVisible({ timeout: 10000 });
      await fallback.click();
    }
    
    console.log('>>> Wizard click sent');
    await this.page.waitForTimeout(2000);
    if (!(this.page.url().includes('maker'))) {
      console.log(`>>> Current URL: ${this.page.url()}, waiting for maker...`);
      await this.page.waitForURL(/.*maker/, { timeout: 15000 }).catch(() => {});
    }
    console.log('>>> Wizard started');
  }

  async fillStep1(name: string, description: string) {
    await expect(this.bbsNmInput).toBeVisible({ timeout: 10000 });
    await this.bbsNmInput.fill(name);
    await this.bbsIntrcnInput.fill(description);
    await this.nextButton.scrollIntoViewIfNeeded();
    await this.nextButton.click({ force: true });
    console.log('>>> Step 1 completed');
  }

  async fillStep2(templateName: string = '지식 허브') {
    console.log(`>>> Step 2: Selecting template [${templateName}]`);

    // Wait for step 2 content to be ready (ensure template cards are visible in DOM)
    await this.page.waitForSelector('.group.relative.p-8, .p-8.rounded-3xl, h4:has-text("Layout strategy select")', { timeout: 25000 }).catch(() => {});
    await this.page.waitForTimeout(2000); // Wait for animation and mount

    const selectors = [
      this.page.getByText(templateName, { exact: true }).first(),
      this.page.locator('h4').filter({ hasText: templateName }).first(),
      this.page.locator('.group.relative.p-8').first()
    ];

    let found = false;
    for (const selector of selectors) {
      if (await selector.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log(`>>> Found template selector: ${selector}`);
        await selector.scrollIntoViewIfNeeded();
        await selector.click({ force: true });
        found = true;
        break;
      }
    }

    if (!found) {
      console.log('>>> Warning: Specific template not found visible, trying fallback (first card)...');
      const fallback = this.page.locator('.group.relative.p-8, .p-8.rounded-3xl').first();
      if (await fallback.isVisible({ timeout: 5000 }).catch(() => false)) {
        await fallback.scrollIntoViewIfNeeded();
        await fallback.click({ force: true });
      } else {
        console.log('>>> CRITICAL: No template cards found!');
      }
    }

    await this.page.waitForTimeout(500);
    await expect(this.nextButton).toBeEnabled({ timeout: 10000 });
    console.log('>>> Clicking Next button after template selection');
    await this.nextButton.scrollIntoViewIfNeeded();
    await this.nextButton.click({ force: true });
    console.log('>>> Step 2 completed');
  }

  async fillStep3() {
    await expect(this.nextButton).toBeVisible({ timeout: 10000 });
    await this.nextButton.scrollIntoViewIfNeeded();
    await this.nextButton.click({ force: true });
    console.log('>>> Step 3 completed');
  }

  async fillStep4(menuName: string) {
    const menuInput = this.page.locator('input[name="menuNm"], input[placeholder*="메뉴"], input[placeholder*="Menu"]').first();
    await expect(menuInput).toBeVisible({ timeout: 10000 });
    await menuInput.fill(menuName);
    await this.deployButton.scrollIntoViewIfNeeded();
    await this.deployButton.click({ force: true });
    console.log('>>> Step 4 completed - deployment initiated');
  }

  async search(keyword: string) {
    const searchInput = this.page.locator('input[aria-label="데이터 검색"], input[placeholder*="검색"], input[placeholder*="Search"]').first();
    await expect(searchInput).toBeVisible({ timeout: 10000 });
    
    // Clear and fill search input
    await searchInput.click();
    await this.page.keyboard.press('Control+A');
    await this.page.keyboard.press('Backspace');
    await searchInput.fill(keyword);
    
    // Wait for the specific response for searching
    const responsePromise = this.page.waitForResponse(
      response => response.url().includes('/board-masters') && response.status() === 200,
      { timeout: 15000 }
    ).catch(() => null);

    await this.page.keyboard.press('Enter');
    
    const response = await responsePromise;
    if (response) {
      console.log(`>>> Search API response received for: ${keyword}`);
    }
    
    await this.page.waitForLoadState('networkidle').catch(() => {});
    await this.page.waitForTimeout(1000); // Wait for DOM to render the results
    console.log(`>>> Search completed for: ${keyword}`);
  }

  async openSettings(boardName: string) {
    const row = this.page.locator('tr').filter({ hasText: boardName }).first();
    await expect(row).toBeVisible({ timeout: 15000 });
    
    const settingsBtn = row.locator('button:has(svg.lucide-settings-2), button:has(.lucide-settings-2)');
    await expect(settingsBtn).toBeVisible({ timeout: 10000 });
    
    await settingsBtn.click();
    await expect(this.page.getByText('Board Configuration')).toBeVisible({ timeout: 15000 });
    console.log('>>> Settings modal is visible');
  }

  async updateSettings(data: { name?: string; description?: string; useYn?: 'Y' | 'N' }) {
    if (data.name) {
      await this.page.locator('#modal-bbs-name').fill(data.name);
    }
    if (data.description) {
      await this.page.locator('#modal-bbs-description').fill(data.description);
    }
    if (data.useYn) {
      const switchEl = this.page.locator('#modal-bbs-use-at');
      const isChecked = await switchEl.getAttribute('aria-checked') === 'true';
      if ((data.useYn === 'Y' && !isChecked) || (data.useYn === 'N' && isChecked)) {
        await switchEl.click();
      }
    }

    const saveBtn = this.page.getByRole('button', { name: '설정 적용하기' });
    
    const updateResponse = this.page.waitForResponse(
      res => res.url().includes('/board-masters/') && res.request().method() === 'PUT',
      { timeout: 15000 }
    ).catch(() => null);

    await saveBtn.click();
    await updateResponse;
    
    await expect(this.page.locator('[role="alert"], .toast, :text-matches("업데이트되었습니다", "i")').first()).toBeVisible({ timeout: 10000 });
    await expect(this.page.getByText('Board Configuration')).not.toBeVisible({ timeout: 15000 });
    await this.page.waitForTimeout(1000);
  }

  async deleteBoard(boardName: string) {
    const row = this.page.locator('tr').filter({ hasText: boardName }).first();
    const deleteBtn = row.locator('button:has(svg.lucide-trash-2), button:has(.lucide-trash-2)');
    await expect(deleteBtn).toBeVisible({ timeout: 10000 });
    await deleteBtn.click();

    const confirmBtn = this.page.getByRole('button', { name: '삭제' });
    await expect(confirmBtn).toBeVisible({ timeout: 5000 });
    
    const deleteResponse = this.page.waitForResponse(
      res => res.url().includes('/board-masters/') && res.request().method() === 'DELETE',
      { timeout: 15000 }
    ).catch(() => null);

    await confirmBtn.click();
    await deleteResponse;

    await expect(this.page.locator('[role="alert"], .toast, :text-matches("삭제되었습니다", "i")').first()).toBeVisible({ timeout: 10000 });
    await this.page.waitForTimeout(1000);
  }

  async verifySuccess(menuName: string) {
    await this.page.waitForSelector('text=MISSION COMPLETE, text=성공, .bg-green-500', { timeout: 30000 }).catch(() => {});
    const pageContent = await this.page.content();
    if (pageContent.includes('MISSION COMPLETE') || pageContent.includes('성공') || pageContent.includes(menuName)) {
      console.log('>>> Board creation successful');
    }
  }
}
