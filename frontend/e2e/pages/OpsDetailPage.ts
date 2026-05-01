import { Page, expect } from '@playwright/test';

export class OpsDetailPage {
    constructor(private page: Page) {}

    async goto() {
        console.log('>>> [OpsDetail] Navigating to Event Ops Center');
        await this.page.goto('/admin/operation/events');
        await expect(this.page.getByRole('heading', { name: /행사 운영 센터/i })).toBeVisible({ timeout: 15000 });
    }

    async searchEvents(keyword: string) {
        console.log(`>>> [OpsDetail] Searching events with keyword: ${keyword}`);
        const searchInput = this.page.getByPlaceholder(/행사 태그 검색/i);
        await expect(searchInput).toBeVisible({ timeout: 10000 });
        
        await searchInput.click();
        await searchInput.fill(''); 
        await searchInput.pressSequentially(keyword, { delay: 100 });
        await this.page.keyboard.press('Enter');
        
        // Wait for list to update - looking for the specific text in the table
        await this.page.waitForTimeout(3000); 
        await this.page.waitForLoadState('networkidle');
    }

    async createEvent(data: { name: string, desc: string, capacity: number, startDate: string, endDate: string, recruitDate: string, recruitEndDate: string }) {
        console.log(`>>> [OpsDetail] Creating New Event: ${data.name}`);
        await this.page.getByRole('button', { name: /행사 신규 생성/i }).click();
        
        await expect(this.page.getByText(/Dispatch New Event/i)).toBeVisible({ timeout: 10000 });
        
        await this.page.getByPlaceholder(/행사 명칭을 입력하십시오/i).fill(data.name);
        await this.page.getByPlaceholder(/상세 내용을 입력하십시오/i).fill(data.desc);
        
        // Date inputs - using fill might be flaky for some date pickers, but let's try
        const dateInputs = this.page.locator('input[type="date"]');
        await dateInputs.nth(0).fill(data.startDate);
        await dateInputs.nth(1).fill(data.endDate);
        
        await this.page.locator('input[type="number"]').fill(data.capacity.toString());
        
        await dateInputs.nth(2).fill(data.recruitDate);
        await dateInputs.nth(3).fill(data.recruitEndDate);
        
        await this.page.getByRole('button', { name: /Deploy Protocol/i }).click();
        await expect(this.page.getByText(/성공|생성되었습니다/i)).toBeVisible({ timeout: 20000 });
        
        // Return to list
        await this.goto();
    }

    async deleteEvent(name: string) {
        console.log(`>>> [OpsDetail] Deleting Event: ${name}`);
        
        // Retry search logic
        let found = false;
        for (let i = 0; i < 3; i++) {
            await this.searchEvents(name);
            const count = await this.page.locator('tr').filter({ hasText: name }).count();
            if (count > 0) {
                found = true;
                break;
            }
            console.log(`>>> [OpsDetail] Event not found in search, retrying (${i+1}/3)...`);
            await this.page.reload();
            await this.page.waitForLoadState('networkidle');
            await this.page.waitForTimeout(3000);
        }

        if (!found) {
            console.log(`>>> [OpsDetail] WARNING: Event "${name}" not found after retries. Skipping delete.`);
            return;
        }
        
        const eventRow = this.page.locator('tr').filter({ hasText: name }).first();
        await expect(eventRow).toBeVisible({ timeout: 10000 });
        
        const deleteBtn = eventRow.getByTestId('delete-event-btn');
        await expect(deleteBtn).toBeVisible({ timeout: 10000 });
        
        // Confirm dialog
        this.page.once('dialog', async dialog => {
            console.log(`>>> [OpsDetail] Accepting dialog: ${dialog.message()}`);
            await dialog.accept();
        });
        
        await deleteBtn.click();
        
        await expect(this.page.getByText(/성공|삭제되었습니다/i)).toBeVisible({ timeout: 20000 });
        console.log(`>>> [OpsDetail] Event "${name}" deleted successfully.`);
    }

    async verifyEventListVisible() {
        console.log('>>> [OpsDetail] Verifying event list is rendered');
        await expect(this.page.getByText(/Global Event Matrix/i)).toBeVisible({ timeout: 15000 });
    }
}
