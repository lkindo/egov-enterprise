import { Page, Locator, expect } from '@playwright/test';

export class SurveyPage {
    readonly page: Page;
    readonly createButton: Locator;
    readonly titleInput: Locator;
    readonly typeSelect: Locator;
    readonly submitButton: Locator;
    readonly searchInput: Locator;

    constructor(page: Page) {
        this.page = page;
        this.createButton = page.getByRole('button', { name: /신규 설문 생성|등록/ });
        this.titleInput = page.locator('#pollNm');
        this.typeSelect = page.getByRole('combobox');
        this.submitButton = page.getByRole('button', { name: '설문 등록 완료' });
        this.searchInput = page.locator('input[placeholder*="검색"]');
    }

    async gotoManage() {
        await this.page.goto('/admin/survey/manage');
        await expect(this.page.getByText('설문 인벤토리')).toBeVisible();
    }

    async createBasicSurvey(title: string) {
        console.log(`>>> Navigating to Survey Create Page`);
        await this.page.goto('/admin/survey/manage/create');
        await this.titleInput.fill(title);
        
        // Select dates
        const datePickers = this.page.locator('button:has(.lucide-calendar)');
        
        // Dynamic dates to avoid disabled past days
        const now = new Date();
        const nextDay = new Date(now);
        nextDay.setDate(now.getDate() + 1);
        const endDay = new Date(now);
        endDay.setDate(now.getDate() + 14);
        
        const startDayStr = String(nextDay.getDate());
        const endDayStr = String(endDay.getDate());
        
        // Start Date
        console.log(`>>> Selecting Start Date: ${startDayStr}`);
        await datePickers.first().click();
        await this.page.waitForSelector('[role="dialog"], .rdp', { timeout: 10000 });
        await this.page.getByRole('button', { name: startDayStr, exact: true }).first().click({ force: true });
        
        // End Date
        console.log(`>>> Selecting End Date: ${endDayStr}`);
        await datePickers.last().click();
        await this.page.waitForSelector('[role="dialog"], .rdp', { timeout: 10000 });
        await this.page.getByRole('button', { name: endDayStr, exact: true }).first().click({ force: true });
        
        console.log('>>> Submitting Survey Form');
        await this.submitButton.click();
        
        // Handle potential dialog or wait for navigation
        await this.page.waitForURL(/\/admin\/survey\/manage/, { timeout: 30000 });
        console.log('>>> Survey Created Successfully');
    }

    async participate(surveyTitle: string) {
        await this.page.goto('/survey');
        await this.page.waitForSelector('.group', { timeout: 20000 });
        
        const surveyCard = this.page.locator('.group', { hasText: surveyTitle }).first();
        // If not found, reload once
        if (await surveyCard.isHidden()) {
            console.log('>>> Survey not found in list, reloading...');
            await this.page.reload();
        }
        
        await expect(surveyCard).toBeVisible({ timeout: 15000 });
        await surveyCard.click();
        
        await expect(this.page.getByText(/참여|설문/i)).toBeVisible({ timeout: 15000 });
    }
}
