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
    await expect(this.page).toHaveURL(/.*maker/, { timeout: 15000 });
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

    // Step 2 is ready only when at least one template card is visible.
    const templateCards = this.page.locator('.group.relative.p-8, .p-8.rounded-3xl');
    await expect(templateCards.first()).toBeVisible({ timeout: 25000 });

    const selectors = [
      this.page.getByText(templateName, { exact: true }).first(),
      this.page.locator('h4').filter({ hasText: templateName }).first(),
      this.page.locator('.group.relative.p-8').first()
    ];

    let found = false;
    for (const selector of selectors) {
      if (await selector.isVisible().catch(() => false)) {
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
      await expect(fallback).toBeVisible({ timeout: 5000 });
      await fallback.scrollIntoViewIfNeeded();
      await fallback.click({ force: true });
    }

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
  }

  async deleteBoard(boardName: string) {
    const row = this.page.locator('tr').filter({ hasText: boardName }).first();
    const deleteBtn = row.locator('button:has(svg.lucide-trash-2), button:has(.lucide-trash-2)');
    await expect(deleteBtn).toBeVisible({ timeout: 10000 });
    await deleteBtn.click();

    // [2026-07-26 정정] 앱은 2단계 삭제다(BoardMasterListClient):
    //   활성(use_yn='Y') → 확인 모달 '게시판 서비스 비활성화' / 확인 버튼 **'비활성화'** (소프트 → 대기)
    //   대기(use_yn='N') → '게시판 영구 물리 삭제' / 확인 버튼 **'영구 삭제'** (게시글 있으면 거부)
    // 종전 셀렉터는 '삭제' 만 찾아, 활성 게시판의 '비활성화' 버튼을 못 찾고 실패했다(로컬 재현으로 확인:
    // 모달은 떠 있고 버튼명만 달랐다). 이 테스트는 마지막에 '대기' 를 단언하므로 소프트 경로가 의도다.
    const confirmBtn = this.page.getByRole('button', { name: /비활성화|영구 삭제|삭제/ });
    await expect(confirmBtn).toBeVisible({ timeout: 5000 });
    
    const deleteResponse = this.page.waitForResponse(
      res => res.url().includes('/board-masters/') && res.request().method() === 'DELETE',
      { timeout: 15000 }
    ).catch(() => null);

    await confirmBtn.click();
    await deleteResponse;

    await expect(this.page.locator('[role="alert"], .toast, :text-matches("삭제되었습니다", "i")').first()).toBeVisible({ timeout: 10000 });
  }

  async verifySuccess(menuName: string) {
    // [E2E 감사 A3] 실제 배포 성공 화면의 제목과 연결된 메뉴명을 하드 단언한다.
    // (과거: waitForSelector(...).catch(()=>{})로 실패를 삼키고 includes(menuName) console.log만 실행 →
    //  menuName은 방금 입력한 값이라 DOM에 항상 존재 → 배포가 실패해도 그린 통과하던 false-green)
    console.log(`>>> Verifying board/menu deployment success for: ${menuName}`);
    await expect(this.page.getByRole('heading', { name: '게시판 생성 완료', exact: true }))
      .toBeVisible({ timeout: 30000 });
    await expect(this.page.getByText(`'${menuName}'`, { exact: true })).toBeVisible();
  }
}
