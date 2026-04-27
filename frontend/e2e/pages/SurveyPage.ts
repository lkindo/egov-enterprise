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
        this.titleInput = page.locator('#qestnrSj, input[placeholder*="주제"]');
        this.typeSelect = page.getByRole('combobox');
        this.submitButton = page.getByRole('button', { name: /설문 등록 완료|등록|저장/ });
        this.searchInput = page.locator('input[placeholder*="검색"]');
        // Selectors for date triggers (Lucide Calendar icons)
        this.startDateTrigger = page.locator('button').filter({ hasText: '날짜 선택' }).first();
        this.endDateTrigger = page.locator('button').filter({ hasText: '날짜 선택' }).last();
    }

    async gotoManage() {
        await this.page.goto('/admin/survey/manage');
        // Wait for inventory text or list
        await expect(this.page.getByText(/설문.*관리|설문.*인벤토리/i)).toBeVisible();
    }

    async gotoCreate() {
        await this.page.goto('/admin/survey/manage/create');
        await expect(this.page.getByText(/설문.*등록|Create.*Survey/i)).toBeVisible();
    }

    private async selectDate(trigger: Locator, targetDate: Date) {
        await trigger.click();
        
        const dayOfMonth = String(targetDate.getDate());
        const openPopover = this.page.locator('[data-radix-popper-content-wrapper]').filter({ visible: true }).first();
        await expect(openPopover).toBeVisible({ timeout: 10000 });
        
        // Match day number
        const dayButton = openPopover.locator('button').filter({ 
            hasText: new RegExp(`^${dayOfMonth}$`) 
        }).or(openPopover.getByRole('button', { name: dayOfMonth })).filter({ visible: true });
        
        if (await dayButton.count() === 0) {
            console.log('>>> Day not found in current month, moving to next month');
            await openPopover.getByRole('button', { name: /Go to the Next Month|다음 달/i }).click();
            await this.page.waitForTimeout(500);
            await dayButton.filter({ visible: true }).first().click({ force: true });
        } else {
            await dayButton.first().click({ force: true });
        }
        
        await this.page.waitForTimeout(300);
        if (await openPopover.isVisible()) {
            await this.page.keyboard.press('Escape');
        }
    }

    async createBasicSurvey(title: string) {
        console.log(`>>> Navigating to Survey Create Page`);
        await this.gotoCreate();
        
        // Wait for input
        await this.titleInput.waitFor({ state: 'visible' });
        await this.titleInput.fill(title);
        
        // Use a date range: today to +7 days
        const start = new Date();
        const end = new Date();
        end.setDate(start.getDate() + 7);
        
        console.log(`>>> Selecting Start Date: ${start.toDateString()}`);
        await this.selectDate(this.startDateTrigger, start);
        
        console.log(`>>> Selecting End Date: ${end.toDateString()}`);
        await this.selectDate(this.endDateTrigger, end);
        
        console.log(`>>> Submitting Survey Form`);
        // Handle dialog auto-accept
        this.page.once('dialog', dialog => {
            console.log(`>>> Accepted dialog: ${dialog.message()}`);
            dialog.accept();
        });
        
        await this.submitButton.click();
        
        // Wait for successful creation (toast or navigation)
        await expect(this.page.getByText(/성공|완료|등록되었습니다/)).toBeVisible({ timeout: 15000 });
        console.log(`>>> Survey Created Successfully`);
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
