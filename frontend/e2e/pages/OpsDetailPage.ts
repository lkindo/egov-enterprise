import { Page, expect } from '@playwright/test';

export class OpsDetailPage {
    constructor(private page: Page) {}

    async goto() {
        console.log('>>> Navigating to Event Ops Center');
        await this.page.goto('/admin/operation/events');
        await expect(this.page.getByRole('heading', { name: /행사 운영 센터/i })).toBeVisible();
    }

    async searchEvents(keyword: string) {
        console.log(`>>> Searching events with keyword: ${keyword}`);
        const searchInput = this.page.getByPlaceholder(/행사 태그 검색/i);
        await searchInput.click();
        await this.page.keyboard.press('Control+A');
        await this.page.keyboard.press('Backspace');
        await searchInput.pressSequentially(keyword, { delay: 100 });
        await this.page.keyboard.press('Enter');
        await this.page.waitForLoadState('networkidle');
        await this.page.waitForTimeout(1000);
    }

    async createEvent(data: { name: string, desc: string, capacity: number, startDate: string, endDate: string, recruitDate: string, recruitEndDate: string }) {
        console.log(`>>> Creating New Event: ${data.name}`);
        await this.page.getByRole('button', { name: /행사 신규 생성/i }).click();
        
        await expect(this.page.getByText(/Dispatch New Event/i)).toBeVisible();
        
        await this.page.getByPlaceholder(/행사 명칭을 입력하십시오/i).fill(data.name);
        await this.page.getByPlaceholder(/상세 내용을 입력하십시오/i).fill(data.desc);
        
        // Date inputs
        await this.page.locator('input[type="date"]').nth(0).fill(data.startDate);
        await this.page.locator('input[type="date"]').nth(1).fill(data.endDate);
        await this.page.locator('input[type="number"]').fill(data.capacity.toString());
        await this.page.locator('input[type="date"]').nth(2).fill(data.recruitDate);
        await this.page.locator('input[type="date"]').nth(3).fill(data.recruitEndDate);
        
        await this.page.getByRole('button', { name: /Deploy Protocol/i }).click();
        await expect(this.page.getByText(/성공|생성되었습니다/i)).toBeVisible();
    }

    async deleteEvent(name: string) {
        console.log(`>>> Deleting Event: ${name}`);
        await this.searchEvents(name);
        
        const eventRow = this.page.locator('tr').filter({ hasText: name }).first();
        await expect(eventRow).toBeVisible({ timeout: 15000 });
        
        const deleteBtn = eventRow.getByTestId('delete-event-btn');
        await expect(deleteBtn).toBeVisible({ timeout: 15000 });
        
        // Confirm dialog - MUST be registered BEFORE the action that triggers it
        this.page.once('dialog', dialog => {
            console.log(`>>> Accepting dialog: ${dialog.message()}`);
            dialog.accept();
        });
        
        await deleteBtn.click();
        
        await expect(this.page.getByText(/성공|삭제되었습니다/i)).toBeVisible({ timeout: 20000 });
    }

    async verifyEventListVisible() {
        console.log('>>> Verifying event list is rendered');
        await expect(this.page.getByText(/Global Event Matrix/i)).toBeVisible();
    }
}
