import { Page, Locator, expect } from '@playwright/test';

export class SurveyPage {
    readonly page: Page;
    readonly createButton: Locator;
    readonly titleInput: Locator;
    readonly typeSelect: Locator;
    readonly submitButton: Locator;
    readonly searchInput: Locator;
    readonly startDateTrigger: Locator;
    readonly endDateTrigger: Locator;

    constructor(page: Page) {
        this.page = page;
        this.createButton = page.getByRole('button', { name: /신규 설문 생성|등록/ });
        this.titleInput = page.locator('#pollNm, input[placeholder*="주제"]');
        this.typeSelect = page.getByRole('combobox');
        this.submitButton = page.getByRole('button', { name: /설문 등록 완료|등록|저장/ });
        this.searchInput = page.locator('input[placeholder*="검색"]');
        // Selectors for date triggers by index, resilient to text changes
        this.startDateTrigger = page.locator('button:has(svg.lucide-calendar)').nth(0);
        this.endDateTrigger = page.locator('button:has(svg.lucide-calendar)').nth(1);
    }

    async gotoManage() {
        await this.page.goto('/admin/survey/manage');
        // Wait for inventory text or list
        await expect(this.page.getByText(/설문.*관리|설문.*인벤토리/i)).toBeVisible();
    }

    async gotoCreate() {
        await this.page.goto('/admin/survey/manage/create');
        await expect(this.page.getByText(/설문.*등록|Create.*Survey/i).first()).toBeVisible();
    }

    /**
     * 캘린더 팝업에서 오늘 날짜를 확실하게 선택합니다.
     * 
     * 실제 DOM 구조 (2026-04 확인):
     *  - 날짜 버튼: .e2e-day-button 클래스 사용
     *  - 오늘 날짜: aria-label="Today, Tuesday, April 28th, 2026" 형식
     *  - button[name="day"] 속성은 존재하지 않음
     */
    private async selectDate(trigger: Locator, isStartDate: boolean) {
        await trigger.click();
        
        const popover = this.page.locator('[data-radix-popper-content-wrapper]').filter({ visible: true }).first();
        await expect(popover).toBeVisible({ timeout: 10000 });

        // Strategy 1 (Primary): aria-label이 "Today"로 시작하는 버튼 클릭
        const todayByLabel = popover.locator('button[aria-label^="Today"]').first();
        if (await todayByLabel.isVisible({ timeout: 2000 }).catch(() => false)) {
            const label = await todayByLabel.getAttribute('aria-label');
            console.log(`>>> [DatePicker] Found today via aria-label: "${label}"`);
            await todayByLabel.click({ force: true });
            await this.page.waitForTimeout(300);
            return;
        }

        // Strategy 2: aria-current="date" (Radix 표준)
        const todayByAria = popover.locator('button[aria-current="date"]').first();
        if (await todayByAria.isVisible({ timeout: 1000 }).catch(() => false)) {
            console.log('>>> [DatePicker] Found today via aria-current="date"');
            await todayByAria.click({ force: true });
            await this.page.waitForTimeout(300);
            return;
        }

        // Strategy 3: .e2e-day-button 클래스로 오늘 날짜 숫자 매칭
        const todayNum = new Date().getDate().toString();
        const dayButtons = popover.locator('.e2e-day-button');
        const count = await dayButtons.count();
        
        console.log(`>>> [DatePicker] Found ${count} day buttons with .e2e-day-button class`);
        
        for (let i = 0; i < count; i++) {
            const text = (await dayButtons.nth(i).textContent())?.trim();
            if (text === todayNum) {
                // 이번 달 버튼인지 확인 (aria-disabled나 opacity로 비활성 날짜 제외)
                const isDisabled = await dayButtons.nth(i).getAttribute('aria-disabled');
                if (isDisabled === 'true') continue;
                
                console.log(`>>> [DatePicker] Clicking .e2e-day-button with text "${todayNum}" (index ${i})`);
                await dayButtons.nth(i).click({ force: true });
                await this.page.waitForTimeout(300);
                return;
            }
        }

        // Strategy 4 (Final Fallback): 아무 활성 날짜든 클릭 (역전 방지 로직 포함)
        console.log('>>> [DatePicker] Could not find today. Using positional fallback.');
        const activeDays = popover.locator('.e2e-day-button:not([aria-disabled="true"])');
        const activeCount = await activeDays.count();
        
        if (activeCount > 0) {
            // startDate → 가운데 날짜, endDate → 마지막 날짜 (역전 방지)
            const idx = isStartDate ? Math.floor(activeCount / 2) : activeCount - 1;
            console.log(`>>> [DatePicker] Fallback: clicking active day at index ${idx} of ${activeCount}`);
            await activeDays.nth(idx).click({ force: true });
        }
        
        await this.page.waitForTimeout(300);
    }

    async createBasicSurvey(title: string) {
        console.log(`>>> Navigating to Survey Create Page`);
        await this.gotoCreate();
        
        // Wait for input
        await this.titleInput.waitFor({ state: 'visible' });
        await this.titleInput.fill(title);
        
        console.log(`>>> Selecting Start Date (today)`);
        await this.selectDate(this.startDateTrigger, true);
        
        // Popover가 닫혔는지 확인 후 종료일 선택
        await this.ensurePopoverClosed();
        
        console.log(`>>> Selecting End Date (today)`);
        await this.selectDate(this.endDateTrigger, false);
        
        await this.ensurePopoverClosed();
        
        console.log(`>>> Submitting Survey Form`);
        // Handle dialog auto-accept (alert 창 대응)
        this.page.once('dialog', dialog => {
            console.log(`>>> Accepted dialog: ${dialog.message()}`);
            dialog.accept();
        });
        
        await this.submitButton.click({ force: true });
        
        // Wait for successful creation (toast or navigation)
        await expect(this.page.getByText(/성공|완료|등록되었습니다/)).toBeVisible({ timeout: 15000 });
        console.log(`>>> Survey Created Successfully`);
    }

    /** Popover가 아직 열려있으면 강제로 닫음 */
    private async ensurePopoverClosed() {
        const openPopover = this.page.locator('[data-radix-popper-content-wrapper]').filter({ visible: true });
        if (await openPopover.isVisible({ timeout: 500 }).catch(() => false)) {
            await this.page.keyboard.press('Escape');
            await this.page.waitForTimeout(300);
        }
    }

    async participate(surveyTitle: string) {
        await this.page.goto('/survey');
        // Wait for any list item
        await this.page.waitForTimeout(2000); 

        const surveyCard = this.page.getByText(surveyTitle).first();
        if (await surveyCard.isHidden()) {
            console.log('>>> Survey not found in list, reloading...');
            await this.page.reload();
        }

        await expect(surveyCard).toBeVisible({ timeout: 15000 });
        await surveyCard.click();
    }

    async checkResults(surveyTitle: string) {
        console.log(`>>> Navigating to Survey Stats for: ${surveyTitle}`);
        await this.gotoManage();
        await this.searchInput.fill(surveyTitle);
        const row = this.page.locator('tr').filter({ hasText: surveyTitle }).first();
        await expect(row).toBeVisible();
    }
}
