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

    private async selectDate(trigger: Locator, targetDate: Date) {
        await trigger.click();
        const targetDay = String(targetDate.getDate());
        
        // Scope to the currently-open Radix PopoverContent to avoid strict mode violation
        // when both date pickers are simultaneously in the DOM
        const openPopover = this.page.locator('[data-radix-popper-content-wrapper]').filter({ visible: true }).first();
        await expect(openPopover).toBeVisible({ timeout: 10000 });
        
        const calendar = openPopover.getByRole('grid');
        
        // Check if the target day exists in the current month (exclude outside-month days)
        let dayButton = calendar.locator('button.e2e-day-button:not(.day-outside)').filter({ hasText: new RegExp(`^${targetDay}$`) });
        
        if (await dayButton.count() === 0) {
            console.log('>>> Day not found in current month, moving to next month');
            // Click the last button in the popover nav (Next Month chevron)
            await openPopover.getByRole('button').last().click();
            await this.page.waitForTimeout(500);
            dayButton = calendar.locator('button.e2e-day-button:not(.day-outside)').filter({ hasText: new RegExp(`^${targetDay}$`) });
        }
        
        await dayButton.first().click({ force: true });
        
        // Ensure the popover is closed after date selection
        // Radix Popover should auto-close on selection, but force-close if not
        if (await openPopover.isVisible()) {
            await this.page.keyboard.press('Escape');
            await this.page.waitForTimeout(200);
        }
    }

    async createBasicSurvey(title: string) {
        console.log(`>>> Navigating to Survey Create Page`);
        await this.page.goto('/admin/survey/manage/create');
        await this.titleInput.fill(title);
        
        // Calculate dates: Start (Tomorrow), End (2 weeks later)
        const now = new Date();
        const startDate = new Date(now);
        startDate.setDate(now.getDate() + 1);
        const endDate = new Date(now);
        endDate.setDate(now.getDate() + 14);
        
        const datePickers = this.page.locator('button:has(.lucide-calendar)');
        
        console.log(`>>> Selecting Start Date: ${startDate.toDateString()}`);
        await this.selectDate(datePickers.first(), startDate);
        
        console.log(`>>> Selecting End Date: ${endDate.toDateString()}`);
        // Re-locate datePickers as the first one changed text after selection
        const updatedDatePickers = this.page.locator('button:has(.lucide-calendar)');
        await this.selectDate(updatedDatePickers.last(), endDate);
        
        console.log('>>> Submitting Survey Form');
        // window.alert fires upon successful registration — register handler before clicking
        // Use .catch(() => null) so it doesn't hang if no dialog appears (e.g. validation error)
        const dialogPromise = this.page.waitForEvent('dialog', { timeout: 10000 }).catch(() => null);
        await this.submitButton.click();
        
        const dialog = await dialogPromise;
        if (dialog) {
            console.log(`>>> Accepted dialog: ${dialog.message()}`);
            await dialog.accept();
        }
        
        // Wait for navigation back to manage page
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

    async checkResults(surveyTitle: string) {
        console.log(`>>> Navigating to Survey Stats for: ${surveyTitle}`);
        // First find the ID in admin manage list
        await this.gotoManage();
        await this.searchInput.fill(surveyTitle);
        const row = this.page.locator('tr').filter({ hasText: surveyTitle }).first();
        await expect(row).toBeVisible();
        
        // Extract ID (usually in a cell)
        const pollId = await row.locator('td').first().textContent();
        console.log(`>>> Extracted Poll ID: ${pollId}`);
        
        await this.page.goto(`/survey/stats?qestnrId=${pollId}`);
        await expect(this.page.getByText('설문 결과 통계')).toBeVisible();
        await expect(this.page.getByText(surveyTitle)).toBeVisible();
    }
}
