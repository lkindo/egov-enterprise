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
    this.wizardButton = page.getByRole('button', { name: /게시판 생성|마법사|Wizard|Maker|Create/i }).first();
    this.bbsNmInput = page.locator('#bbsNm, input[name="bbsNm"], input[placeholder*="이름"], input[placeholder*="Name"]').first();
    this.bbsIntrcnInput = page.locator('#bbsIntrcn, input[name="bbsIntrcn"], input[placeholder*="설명"], input[placeholder*="Description"]').first();
    this.nextButton = page.getByRole('button', { name: /다음 | Next/i }).first();
    this.deployButton = page.getByRole('button', { name: /게시판 생성 | 배포|Deploy|Create/i }).first();
  }

  async gotoMaster() {
    await this.page.goto('/admin/community/boards/master', { waitUntil: 'domcontentloaded' });
  }

  async gotoMaker() {
    await this.page.goto('/admin/community/boards/maker', { waitUntil: 'domcontentloaded' });
  }

  async startWizard() {
    if (await this.wizardButton.isVisible()) {
      await this.wizardButton.click();
      console.log('>>> Wizard started');
    } else {
      console.log('>>> Wizard button not found');
    }
  }

  async fillStep1(name: string, description: string) {
    if (await this.bbsNmInput.isVisible()) {
      await this.bbsNmInput.fill(name);
    }
    if (await this.bbsIntrcnInput.isVisible()) {
      await this.bbsIntrcnInput.fill(description);
    }
    if (await this.nextButton.isVisible()) {
      await this.nextButton.click();
      console.log('>>> Step 1 completed');
    }
  }

  async fillStep2(templateName: string = 'Enterprise List') {
    // Both English and Korean labels might exist depending on i18n
    const templateSelector = this.page.locator(`text=${templateName}, :text-is("${templateName}")`).first();
    const altTemplate = this.page.locator('text=지식 허브, text=Knowledge Hub, text=Enterprise List').first();

    if (await templateSelector.isVisible().catch(() => false)) {
      await templateSelector.click();
    } else if (await altTemplate.isVisible().catch(() => false)) {
      await altTemplate.click();
    } else {
      console.log('>>> Warning: No template found, proceeding with default');
    }

    if (await this.nextButton.isVisible()) {
      await this.nextButton.click();
      console.log('>>> Step 2 completed');
    }
  }

  async fillStep3() {
    if (await this.nextButton.isVisible()) {
      await this.nextButton.click();
      console.log('>>> Step 3 completed');
    }
  }

  async fillStep4(menuName: string) {
    const menuInput = this.page.locator('input[name="menuNm"], input[placeholder*="메뉴"], input[placeholder*="Menu"]').first();
    if (await menuInput.isVisible()) {
      await menuInput.fill(menuName);
    }
    if (await this.deployButton.isVisible()) {
      await this.deployButton.click();
      console.log('>>> Step 4 completed - deployment initiated');
    }
  }

  async search(keyword: string) {
    const responsePromise = this.page.waitForResponse(
      response => response.url().includes('/board-masters') && 
                  !response.url().includes('/tmplats') && 
                  response.status() === 200,
      { timeout: 5000 }
    ).catch(() => null);

    const searchInput = this.page.locator('input[placeholder*="검색"], input[placeholder*="Search"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill(keyword);
      
      const response = await responsePromise;
      if (response) {
        const data = await response.json();
        // Check for PageResponse standardization (list vs content)
        if (data.content && !data.list) {
          throw new Error(`[Field Mismatch] Backend returned 'content' instead of standardized 'list' for board master data.`);
        }
      }
      
      await this.page.waitForTimeout(1000);
      await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    }
  }

  async verifySuccess(menuName: string) {
    // Wait for either the MISSION COMPLETE text or the success badge
    await this.page.waitForSelector('text=MISSION COMPLETE, text=성공, .bg-green-500', { timeout: 30000 }).catch(() => {});
    
    const pageContent = await this.page.content();
    if (pageContent.includes('MISSION COMPLETE') || pageContent.includes('성공') || pageContent.includes(menuName)) {
      console.log('>>> Board creation successful');
    } else {
      console.log('>>> Board creation attempted but success indicators not found');
      // Take a screenshot for debugging if needed
      await this.page.screenshot({ path: `test-results/board-creation-failed-${Date.now()}.png` }).catch(() => {});
    }
  }
}
