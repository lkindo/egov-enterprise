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

        // onChange-based search: intercept the API response triggered by typing
        const [response] = await Promise.all([
            this.page.waitForResponse(
                resp => resp.url().includes('/events') && resp.status() === 200,
                { timeout: 15000 }
            ),
            searchInput.pressSequentially(keyword, { delay: 80 })
        ]);
        
        // Extra buffer for React state & TanStack Query to re-render
        await this.page.waitForTimeout(1000);
        console.log(`>>> [OpsDetail] Search API responded (status: ${response.status()})`);
    }

    async createEvent(data: { name: string, desc: string, capacity: number, startDate: string, endDate: string, recruitDate: string, recruitEndDate: string }) {
        console.log(`>>> [OpsDetail] Creating New Event: ${data.name}`);
        await this.page.getByRole('button', { name: /행사 신규 생성/i }).click();
        
        await expect(this.page.getByText(/Dispatch New Event/i)).toBeVisible({ timeout: 10000 });
        
        await this.page.getByPlaceholder(/행사 명칭을 입력하십시오/i).fill(data.name);
        await this.page.getByPlaceholder(/상세 내용을 입력하십시오/i).fill(data.desc);
        
        const dateInputs = this.page.locator('input[type="date"]');
        await expect(dateInputs.first()).toBeVisible({ timeout: 10000 });

        await dateInputs.nth(0).fill(data.startDate);
        await dateInputs.nth(1).fill(data.endDate);
        
        await this.page.locator('input[type="number"]').fill(data.capacity.toString());
        
        await dateInputs.nth(2).fill(data.recruitDate);
        await dateInputs.nth(3).fill(data.recruitEndDate);
        
        const deployBtn = this.page.getByRole('button', { name: /Deploy Protocol/i });
        
        const [response] = await Promise.all([
            this.page.waitForResponse(resp => resp.url().includes('/events') && resp.request().method() === 'POST', { timeout: 15000 }),
            deployBtn.click()
        ]);
        
        console.log(`>>> [OpsDetail] Create API responded (status: ${response.status()})`);
        if (response.status() !== 200) {
            console.log(`>>> [OpsDetail] Create API Error Body: ${await response.text()}`);
        }
        
        // Wait for either: success toast OR modal close (either proves submission succeeded)
        await Promise.race([
            this.page.getByRole('alert').filter({ hasText: /성공|생성되었습니다/i })
                .waitFor({ state: 'visible', timeout: 25000 }),
            this.page.getByText(/Dispatch New Event/i)
                .waitFor({ state: 'hidden', timeout: 25000 })
        ]);
        console.log('>>> [OpsDetail] Event creation confirmed (toast or modal closed).');
        
        // Return to list and wait for DB to reflect the new event
        await this.goto();
        await this.page.waitForTimeout(2000);
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
            throw new Error(`[OpsDetail] CRITICAL: Event "${name}" not found after retries. Deletion impossible.`);
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
