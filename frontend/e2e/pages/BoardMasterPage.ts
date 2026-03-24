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
    this.wizardButton = page.getByRole('button', { name: /게시판 생성 마법사|Launch Maker Wizard/i }).first();
    this.bbsNmInput = page.locator('#bbsNm');
    this.bbsIntrcnInput = page.locator('#bbsIntrcn');
    this.nextButton = page.getByRole('button', { name: /다음 단계로/i });
    this.deployButton = page.getByRole('button', { name: /게시판 생성 및 메뉴 배포/i });
  }

  async gotoMaster() {
    await this.page.goto('/admin/community/boards/master', { waitUntil: 'networkidle' });
  }

  async gotoMaker() {
    await this.page.goto('/admin/community/boards/maker', { waitUntil: 'networkidle' });
  }

  async startWizard() {
    await this.wizardButton.click();
    await expect(this.page.getByText('STEP 01')).toBeVisible();
  }

  async fillStep1(name: string, description: string) {
    await this.bbsNmInput.fill(name);
    await this.bbsIntrcnInput.fill(description);
    await this.nextButton.click();
    await expect(this.page.getByText('STEP 02')).toBeVisible();
  }

  async fillStep2(templateName: string = 'Knowledge Hub') {
    await this.page.getByText(templateName).click();
    await this.nextButton.click();
    await expect(this.page.getByText('STEP 03')).toBeVisible();
  }

  async fillStep3() {
    // Default permissions are fine for test
    await this.nextButton.click();
    await expect(this.page.getByText('STEP 04')).toBeVisible();
  }

  async fillStep4(menuName: string) {
    await this.page.locator('input[name="menuNm"]').fill(menuName);
    await this.deployButton.click();
  }

  async verifySuccess(menuName: string) {
    await expect(this.page.getByText('MISSION COMPLETE!')).toBeVisible({ timeout: 10000 });
    await expect(this.page.getByText(menuName)).toBeVisible();
  }
}
