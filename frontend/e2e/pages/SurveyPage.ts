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

    private async selectDate(trigger: Locator, targetDate: Date) {
        await trigger.click();
        
        const openPopover = this.page.locator('[data-radix-popper-content-wrapper]').filter({ visible: true }).first();
        await expect(openPopover).toBeVisible({ timeout: 10000 });
        
        const now = new Date();
        const monthDiff = (targetDate.getFullYear() - now.getFullYear()) * 12 + targetDate.getMonth() - now.getMonth();
        
        for (let i = 0; i < monthDiff; i++) {
            const nextMonthBtn = openPopover.getByRole('button', { name: /next|다음/i }).first();
            if (await nextMonthBtn.isVisible()) {
                await nextMonthBtn.click({ force: true });
                await this.page.waitForTimeout(800);
            } else {
                // Fallback to chevron right icon
                const nextByIcon = openPopover.locator('button:has(svg.lucide-chevron-right)').first();
                if (await nextByIcon.isVisible()) {
                    await nextByIcon.click({ force: true });
                    await this.page.waitForTimeout(800);
                }
            }
        }
        
        const dayOfMonth = String(targetDate.getDate());
        
        // Click the exact day button, avoiding outside days
        const dayButton = openPopover.locator(`button:not(.text-muted-foreground):has-text("${dayOfMonth}")`).filter({ visible: true }).first();
        
        if (await dayButton.count() > 0) {
            await dayButton.click({ force: true });
        } else {
            console.log(`>>> Day ${dayOfMonth} not found without muted text, using broad text match`);
            await openPopover.getByText(dayOfMonth, { exact: true }).filter({ visible: true }).first().click({ force: true });
        }
        
        await this.page.waitForTimeout(300);
        if (await openPopover.isVisible()) {
            await this.page.keyboard.press('Escape');
            await this.page.waitForTimeout(300);
        }
    }

    async createBasicSurvey(title: string) {
        console.log(`>>> Navigating to Survey Create Page`);
        await this.gotoCreate();
        
        // Wait for input
        await this.titleInput.waitFor({ state: 'visible' });
        await this.titleInput.fill(title);
        
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
        
        await this.submitButton.click({ force: true });
        
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
