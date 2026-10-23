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
      hasText: /게시판 만들기|NEW BOARD WIZARD|마법사|Wizard|Maker|Create/i
    }).or(page.locator('button:has(svg.lucide-rocket), button:has(.lucide-rocket)')).first();

    this.bbsNmInput = page.locator('#bbsTtl').first();
    this.bbsIntrcnInput = page.locator('#bbsExpln').first();
    this.nextButton = page.locator('button').filter({ hasText: /다음 단계로|Next/i }).first();
    // [2026-10-23 ADR-0040 §5.3] 마지막 단계(최종 확인)의 제출 단추.
    this.deployButton = page.getByRole('button', { name: '게시판 만들기', exact: true });
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
    } catch {
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
    await this.nextButton.click();
    await expect(this.page.getByRole('heading', { name: '화면·기능', exact: true }))
      .toBeVisible({ timeout: 10000 });
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
    await this.nextButton.click();
    await expect(this.page.getByRole('heading', { name: '메뉴·접근 확인', exact: true }))
      .toBeVisible({ timeout: 10000 });
    console.log('>>> Step 2 completed');
  }

  /** 3단계(메뉴·접근 확인) — 메뉴 이름을 정하고 최종 확인으로 간다. */
  async fillStep3(menuName: string) {
    const menuInput = this.page.getByLabel('메뉴 명칭', { exact: true });
    await expect(menuInput).toBeVisible({ timeout: 10000 });
    await menuInput.fill(menuName);
    await this.nextButton.scrollIntoViewIfNeeded();
    await this.nextButton.click();
    await expect(this.page.getByRole('heading', { name: '최종 확인', exact: true }))
      .toBeVisible({ timeout: 10000 });
    console.log('>>> Step 3 completed');
  }

  /** 4단계(최종 확인) — 사용 안 함 게시판·비활성 메뉴로 만든다. */
  async fillStep4() {
    await expect(this.page.getByText('게시판: 사용 안 함으로 만들어져 이용자에게 닫혀 있습니다', { exact: false })).toBeVisible({ timeout: 10000 });
    await this.deployButton.scrollIntoViewIfNeeded();
    await this.deployButton.click();
    console.log('>>> Step 4 completed - creation initiated');
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

  async verifySuccess(menuName: string) {
    // [E2E 감사 A3] 실제 생성 성공 화면의 제목과 연결된 메뉴명을 하드 단언한다.
    // (과거: waitForSelector(...).catch(()=>{})로 실패를 삼키고 includes(menuName) console.log만 실행 →
    //  menuName은 방금 입력한 값이라 DOM에 항상 존재 → 배포가 실패해도 그린 통과하던 false-green)
    console.log(`>>> Verifying board/menu creation success for: ${menuName}`);
    await expect(this.page.getByRole('heading', { name: '게시판 만들기 완료', exact: true }))
      .toBeVisible({ timeout: 30000 });
    await expect(this.page.getByText(`'${menuName}'`, { exact: true })).toBeVisible();
  }

  /** [2026-10-23 ADR-0040 §5.3] 결과 화면의 주 동작 — 운영 화면의 메뉴·접근 탭(공개 준비)으로 간다. */
  async continuePublicationReadiness() {
    await this.page.getByRole('button', { name: '이 게시판 공개 준비 계속하기' }).click();
    await expect(this.page).toHaveURL(/\/admin\/community\/boards\/master\/BBSMSTR_[A-Z0-9]{12}\?tab=access/, { timeout: 15000 });
    await expect(this.page.getByRole('heading', { name: '공개 준비 점검' })).toBeVisible({ timeout: 15000 });
  }

  /** 운영 화면 설정 탭에서 이름·소개·게시판 사용을 고치고 확인 표를 거쳐 저장한다(ADR-0040 §5.5). */
  async updateSettingsOnOperations(data: { name?: string; description?: string; useYn?: 'Y' | 'N' }) {
    await this.page.getByRole('tab', { name: '설정' }).click();
    if (data.name) await this.page.locator('#board-settings-name').fill(data.name);
    if (data.description) await this.page.locator('#board-settings-description').fill(data.description);
    if (data.useYn) {
      const switchEl = this.page.locator('#board-settings-useYn');
      const isChecked = await switchEl.getAttribute('aria-checked') === 'true';
      if ((data.useYn === 'Y' && !isChecked) || (data.useYn === 'N' && isChecked)) await switchEl.click();
    }
    await this.page.getByRole('button', { name: '변경 내용 확인' }).click();
    const review = this.page.getByRole('dialog', { name: '변경 내용 확인' });
    await expect(review).toBeVisible({ timeout: 10000 });
    const updateResponse = this.page.waitForResponse(
      res => res.url().includes('/board-masters/') && res.request().method() === 'PUT',
      { timeout: 15000 }
    );
    await review.getByRole('button', { name: '설정 저장' }).click();
    expect((await updateResponse).status()).toBe(200);
    await expect(this.page.getByText('게시판 설정을 저장했습니다.')).toBeVisible({ timeout: 10000 });
    await expect(review).not.toBeVisible({ timeout: 15000 });
  }

  /** [2026-10-23 ADR-0040 §5.4 B1] 운영 화면의 게시물 탭을 연다. */
  async openPostsTab(bbsId: string) {
    await this.page.goto(`/admin/community/boards/master/${bbsId}?tab=posts`, { waitUntil: 'domcontentloaded' });
    await expect(this.page.getByRole('heading', { level: 2, name: '게시물' })).toBeVisible({ timeout: 15000 });
  }

  /**
   * 게시물 탭의 게시 상태 조건을 고르고 `조회` 로 적용한다(조건은 URL 밖 상태다). `serverQuery` 를 주면 그 조건을 실은 목록 요청의
   * 응답을 기다린다 — 처음 쓰는 조건이라 요청이 반드시 나간다. 앞서 받은 조건(예: '전체')으로 돌아가면 쿼리 캐시(전역 staleTime 60초)가
   * 서버에 다시 묻지 않을 수 있어 응답을 기다리지 않는다. 그때는 호출한 쪽이 표의 행으로 결과를 확인한다(2026-10-23 CI 에서 '전체' 로
   * 돌아가는 응답 대기가 15초를 넘겼다).
   */
  async filterPostsByStatus(statusLabel: '전체' | '게시 중' | '예약' | '게시 종료', serverQuery?: string) {
    await this.page.getByRole('combobox', { name: '게시 상태' }).selectOption({ label: statusLabel });
    await this.applyPostFilter(serverQuery);
  }

  /** [B2] 게시물 탭의 상단 고정 조건을 고르고 `조회` 로 적용한다(서버가 오늘 기준으로 판정한다). `serverQuery` 는 위와 같다. */
  async filterPostsByPinned(pinnedLabel: '전체' | '고정 글' | '고정 아닌 글', serverQuery?: string) {
    await this.page.getByRole('combobox', { name: '상단 고정' }).selectOption({ label: pinnedLabel });
    await this.applyPostFilter(serverQuery);
  }

  private async applyPostFilter(serverQuery?: string) {
    const listResponse = serverQuery
      ? this.page.waitForResponse(
        res => /\/api\/v1\/boards\/BBSMSTR_[A-Z0-9]{12}\?/.test(res.url()) && res.url().includes(serverQuery)
          && res.request().method() === 'GET',
        { timeout: 15000 }
      )
      : undefined;
    await this.page.getByRole('button', { name: '조회', exact: true }).click();
    if (listResponse) expect((await listResponse).status()).toBe(200);
  }

  /** 한 글의 일정 바꾸기(빠른 편집)로 시작일·종료일을 바꿔 저장한다. 날짜는 yyyy-MM-dd 다. */
  async changePostPeriod(title: string, dates: { begin?: string; end?: string }) {
    await this.page.getByRole('button', { name: `${title} 일정 바꾸기` }).click();
    const dialog = this.page.getByRole('dialog', { name: '일정 바꾸기' });
    await expect(dialog).toBeVisible({ timeout: 10000 });
    if (dates.begin) await dialog.getByLabel('게시 시작일', { exact: true }).fill(dates.begin);
    if (dates.end) await dialog.getByLabel('게시 종료일', { exact: true }).fill(dates.end);
    const periodResponse = this.page.waitForResponse(
      res => res.url().includes('/period') && res.request().method() === 'PATCH',
      { timeout: 15000 }
    );
    await dialog.getByRole('button', { name: '일정 저장', exact: true }).click();
    expect((await periodResponse).status()).toBe(200);
    await expect(dialog).not.toBeVisible({ timeout: 15000 });
  }

  /** 고른 글의 게시 종료일을 한꺼번에 바꾼다(선택 처리 — 서버가 전체를 다시 판정한다). 날짜는 yyyy-MM-dd 다. */
  async bulkChangeEnd(titles: string[], end: string) {
    for (const title of titles) await this.page.getByRole('checkbox', { name: `${title} 선택` }).check();
    await this.page.getByRole('button', { name: /^종료일 바꾸기$/ }).click();
    const dialog = this.page.getByRole('dialog', { name: '종료일 바꾸기' });
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await dialog.getByLabel(/새 게시 종료일/).fill(end);
    const batchResponse = this.page.waitForResponse(
      res => res.url().includes('/posts/batch/period') && res.request().method() === 'POST',
      { timeout: 15000 }
    );
    await dialog.getByRole('button', { name: `선택한 ${titles.length}건 종료일 바꾸기`, exact: true }).click();
    expect((await batchResponse).status()).toBe(200);
    await expect(dialog).not.toBeVisible({ timeout: 15000 });
  }

  /** 게시판 관리 목록에서 한 행을 골라 사용 안 함으로 바꾼다(단건 비활성화는 일괄 경로로 흡수됐다 — §5.2). */
  async deactivateFromList(boardName: string) {
    const row = this.page.locator('tr').filter({ hasText: boardName }).first();
    await expect(row).toBeVisible({ timeout: 15000 });
    await row.getByRole('checkbox').check();
    await this.page.getByRole('button', { name: /사용 안 함으로 바꾸기$/ }).first().click();
    const dialog = this.page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    const statusResponse = this.page.waitForResponse(
      res => res.url().includes('/board-masters/batch/status') && res.request().method() === 'POST',
      { timeout: 15000 }
    );
    await dialog.getByRole('button', { name: '사용 안 함으로 바꾸기' }).click();
    expect((await statusResponse).status()).toBe(200);
  }
}
