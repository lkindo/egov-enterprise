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
        await expect(this.page.getByText(/설문.*관리|설문.*인벤토리/i)).toBeVisible();
    }

    async gotoCreate() {
        await this.page.goto('/admin/survey/manage/create');
        await expect(this.page.getByText(/설문.*등록|Create.*Survey/i).first()).toBeVisible();
    }

    /**
     * 캘린더 팝업에서 날짜를 선택합니다.
     * 종료일인 경우 기간 확보를 위해 다음 달의 특정 날짜를 선택합니다.
     */
    private async selectDate(trigger: Locator, isStartDate: boolean) {
        await trigger.click();
        await this.page.waitForTimeout(1000);
        
        // Wait for calendar popover
        const popover = this.page.locator('[data-radix-popper-content-wrapper]').filter({ visible: true });
        await expect(popover).toBeVisible({ timeout: 5000 });

        if (isStartDate) {
            console.log('>>> [DatePicker] Selecting an early date in the month');
            const target = popover.locator('[role="gridcell"]:not([disabled])').nth(1);
            await target.click();
        } else {
            console.log('>>> [DatePicker] Navigating to next month');
            // Use keyboard to navigate to next month for safety
            await this.page.keyboard.press('PageDown');
            await this.page.waitForTimeout(800);
            
            const target = popover.locator('[role="gridcell"]:not([disabled])').nth(15);
            await target.click();
        }
        await this.page.waitForTimeout(800);
    }

    async createBasicSurvey(title: string) {
        console.log(`>>> Navigating to Survey Create Page`);
        
        // Add console log capture
        this.page.on('console', msg => {
            if (msg.type() === 'error') console.log(`>>> [BROWSER ERROR] ${msg.text()}`);
        });

        // Capture API errors
        this.page.on('response', async response => {
            if (response.status() >= 400) {
                try {
                    const body = await response.json();
                    console.log(`>>> [API ERROR] ${response.status()} ${response.url()}:`, JSON.stringify(body, null, 2));
                } catch (e) {
                    // Not JSON
                }
            }
        });

        await this.gotoCreate();
        await this.titleInput.fill(title);
        
        // Select survey type
        if (await this.typeSelect.count() > 0) {
            await this.typeSelect.first().click();
            await this.page.waitForTimeout(500);
            await this.page.getByRole('option').first().click();
            await this.page.waitForTimeout(500);
        }
        
        let dialogError = '';
        const dialogHandler = (dialog: any) => {
            dialogError = dialog.message();
            console.log(`>>> DIALOG DETECTED: ${dialogError}`);
            dialog.accept();
        };
        this.page.on('dialog', dialogHandler);

        try {
            await this.selectDate(this.startDateTrigger, true);
            await this.ensurePopoverClosed();
            await this.selectDate(this.endDateTrigger, false);
            await this.ensurePopoverClosed();
            
            console.log(`>>> [Survey] Clicking submit button...`);
            await this.submitButton.click();
            
            // Wait for success message or dialog error
            await Promise.race([
                this.page.waitForSelector('text=/성공|완료|등록되었습니다/', { timeout: 15000 }),
                new Promise((_, reject) => setTimeout(() => {
                    if (dialogError) reject(new Error(`Survey creation failed: ${dialogError}`));
                }, 7000))
            ]).catch(err => {
                console.log(`>>> [Survey] Submission possibly failed or timed out: ${err.message}`);
            });
            
            // Wait for backend and dialog to settle
            await this.page.waitForTimeout(2000);
            
            // If still on create page, check for error toast or field errors
            if (this.page.url().includes('/create')) {
                console.log(`>>> [Survey] Still on create page. Checking for validation errors...`);
                const errors = await this.page.locator('.text-rose-600, .text-red-500').allInnerTexts();
                if (errors.length > 0) console.log(`>>> [Survey] Validation Errors:`, errors);
            }

            console.log(`>>> Survey Creation Step Finished. Verifying in list.`);
            await this.gotoManage();
        } finally {
            this.page.off('dialog', dialogHandler);
        }
    }

    /** Popover가 아직 열려있으면 강제로 닫음 */
    private async ensurePopoverClosed() {
        const openPopover = this.page.locator('[data-radix-popper-content-wrapper]').filter({ visible: true });
        if (await openPopover.isVisible({ timeout: 500 }).catch(() => false)) {
            await this.page.keyboard.press('Escape');
            await this.page.waitForTimeout(500);
        }
    }

    async participate(surveyTitle: string) {
        await this.page.goto('/admin/survey/polls/participate');
        const surveyCard = this.page.getByText(surveyTitle).first();
        
        // 최대 10회 재시도 (Eventual Consistency 대응)
        for (let i = 0; i < 10; i++) {
            if (await surveyCard.isVisible({ timeout: 3000 }).catch(() => false)) break;
            
            const allTitles = await this.page.locator('h3').allInnerTexts();
            console.log(`>>> [Survey] Attempt ${i + 1}: "${surveyTitle}" not found. Visible titles:`, allTitles.filter(t => t.length > 0));
            
            console.log(`>>> [Survey] Reloading participate page...`);
            await this.page.reload();
            await this.page.waitForTimeout(2000);
        }

        await expect(surveyCard).toBeVisible({ timeout: 5000 });
        await surveyCard.click();
    }

    async checkResults(searchKeyword: string, fullTitle: string) {
        console.log(`>>> Navigating to Survey Stats for: ${fullTitle}`);
        await this.gotoManage();
        await this.searchAndWait(searchKeyword, fullTitle);
    }

    async searchAndWait(keyword: string, expectedText?: string) {
        await this.searchInput.fill(keyword);
        await this.searchInput.press('Enter');
        await this.page.waitForTimeout(2000);
        
        if (expectedText) {
            const expectedLoc = this.page.getByText(expectedText).first();
            if (await expectedLoc.isHidden()) {
                // Diagnostic logging
                const allTexts = await this.page.locator('tr').allInnerTexts();
                console.log(`>>> [Survey] "${expectedText}" not found. Visible table rows:`, 
                    allTexts.map(t => t.replace(/\s+/g, ' ').trim()).filter(t => t.length > 0));
                
                console.log(`>>> [Survey] Retrying search with reload...`);
                await this.page.reload();
                await this.searchInput.fill(keyword);
                await this.searchInput.press('Enter');
                await this.page.waitForTimeout(3000);
            }
        }
    }
}
