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
        const searchInput = this.page.getByPlaceholder(/행사 검색/i);
        await expect(searchInput).toBeVisible({ timeout: 10000 });
        
        await searchInput.click();
        await searchInput.fill('');

        // onChange-based search: intercept the API response triggered by typing
        const [response] = await Promise.all([
            this.page.waitForResponse(
                resp => resp.url().includes('/events') && resp.status() === 200,
                { timeout: 60000 }
            ),
            searchInput.pressSequentially(keyword, { delay: 80 })
        ]);
        
        // Extra buffer for React state & TanStack Query to re-render
        await this.page.waitForTimeout(1000);
        console.log(`>>> [OpsDetail] Search API responded (status: ${response.status()})`);
    }

    // [2026-07-27 정정] 종전 시그니처엔 recruitDate/recruitEndDate 가 있었고 date 입력이 4개라고 가정해
    // nth(2)/nth(3) 을 채웠다. 그러나 EventInfo 엔티티에는 모집일 컬럼이 **존재하지 않으며**(실측)
    // 폼의 date 입력도 행사 시작일·종료일 2개뿐이다. 도메인에 없던 팬텀 파라미터라 제거한다.
    async createEvent(data: { name: string, desc: string, capacity: number, startDate: string, endDate: string }) {
        console.log(`>>> [OpsDetail] Creating New Event: ${data.name}`);
        // Button text is "행사 등록"
        await this.page.getByRole('button', { name: /행사 등록/i }).click();
        
        // [2026-07-27 정정] 종전엔 /Dispatch New Event/i 를 기다렸으나 그 문구는 저장소에 존재하지 않는다.
        // 실측 제목은 '신규 행사 등록'(EventManagementClient DialogTitle).
        await expect(this.page.getByRole('heading', { name: '신규 행사 등록' })).toBeVisible({ timeout: 10000 });
        
        await this.page.getByPlaceholder(/행사 명칭을 입력하십시오/i).fill(data.name);
        await this.page.getByPlaceholder(/상세 내용을 입력하십시오/i).fill(data.desc);
        
        const dateInputs = this.page.getByRole('dialog').locator('input[type="date"]');
        await expect(dateInputs.first()).toBeVisible({ timeout: 10000 });
        await expect(dateInputs).toHaveCount(2);

        await dateInputs.nth(0).fill(data.startDate);
        await dateInputs.nth(1).fill(data.endDate);

        await this.page.getByRole('dialog').locator('input[type="number"]').fill(data.capacity.toString());
        
        // 제출 버튼도 '행사 등록' 이라 목록의 등록 트리거와 이름이 겹친다 → 다이얼로그로 한정한다.
        // (종전 /Deploy Protocol/i 역시 실존하지 않는 문구였다.)
        const deployBtn = this.page.getByRole('dialog').getByRole('button', { name: '행사 등록' });
        
        const [response] = await Promise.all([
            this.page.waitForResponse(resp => resp.url().includes('/events') && resp.request().method() === 'POST', { timeout: 60000 }),
            deployBtn.click()
        ]);
        
        console.log(`>>> [OpsDetail] Create API responded (status: ${response.status()})`);
        if (response.status() !== 200) {
            console.log(`>>> [OpsDetail] Create API Error Body: ${await response.text()}`);
        }
        
        // Wait for either: success toast OR modal close (either proves submission succeeded)
        await Promise.race([
            this.page.getByRole('alert').filter({ hasText: /성공|생성되었습니다/i }).first()
                .waitFor({ state: 'visible', timeout: 25000 }),
            this.page.getByRole('heading', { name: '신규 행사 등록' })
                .waitFor({ state: 'hidden', timeout: 25000 })
        ]);
        console.log('>>> [OpsDetail] Event creation confirmed (toast or modal closed).');
        
        // Return to list and wait for DB to reflect the new event
        // Invalidation happens automatically, reload is redundant and causes next-coverage build to hang.
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
        
        await deleteBtn.click();

        // [2026-07-27 정정] 종전 코드는 page.once('dialog') 로 **네이티브** window.confirm 을 수락하려 했다.
        // 그러나 앱은 커스텀 확인 다이얼로그(useConfirm, Radix Dialog)를 쓴다 — 핸들러가 한 번도 불리지 않는
        // 死코드였고 확인 버튼은 아무도 누르지 않아 삭제가 진행되지 않았다. 실제 다이얼로그를 누른다.
        const confirmDeleteBtn = this.page.getByRole('dialog').getByRole('button', { name: '삭제', exact: true });
        await expect(confirmDeleteBtn).toBeVisible({ timeout: 10000 });
        await confirmDeleteBtn.click();
        
        await expect(this.page.getByText(/성공|삭제되었습니다/i).first()).toBeVisible({ timeout: 20000 });
        console.log(`>>> [OpsDetail] Event "${name}" deleted successfully.`);
    }

    async verifyEventListVisible() {
        console.log('>>> [OpsDetail] Verifying event list is rendered');
        // 종전 /Global Event Matrix/i 는 저장소에 존재하지 않는 문구였다. 실측 제목으로 맞춘다.
        await expect(this.page.getByText('행사 운영 센터').first()).toBeVisible({ timeout: 15000 });
    }
}
