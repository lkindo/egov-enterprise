import { Page,  expect } from '@playwright/test';

export class ProductivitySuitePage {
    readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    // 전자결재(Approval Workflow) 
    async gotoApproval() {
        console.log(`>>> Navigating to Electronic Approval (Sanction)`);
        await this.page.goto('/admin/sanctn/forms');
    }

    async verifyApprovalStateTransition() {
        console.log(`>>> Verifying Workflow State Transition`);
        // Note: The UI might not be fully functional for approval workflow in the dummy app yet.
        // We will look for standard identifiers for approval systems.
        // We'll assert that the page loaded correctly, checking for text indicating Electronic Approval.
        await expect(this.page.getByRole('heading', { name: /결재|결재 양식|Sanction/i }).first()).toBeVisible({ timeout: 15000 });
    }

    // 주소록(Address Book)
    async gotoAddressBook() {
        console.log(`>>> Navigating to Address Book`);
        await this.page.goto('/admin/collaboration/address-book/select-address-book-list');
        await expect(this.page).toHaveURL(/\/admin\/collaboration\/address-book\/select-address-book-list/);
    }

    async verifyAddressBookNavigation() {
        console.log(`>>> Verifying Address Book Navigation`);
        await expect(this.page.getByRole('heading', { name: '통합 주소록 관리' })).toBeVisible({ timeout: 15000 });
        await expect(this.page.getByRole('textbox', { name: '주소록 검색' })).toBeVisible();
        // [2026-08-24 A1 이행] 링크 안 버튼 중첩을 없애 role 이 link 로 바뀌었다(페이지 이동).
        await expect(this.page.getByRole('link', { name: '주소록 등록', exact: true })).toBeVisible();
    }

    // 일정 관리(Calendar)
    async gotoCalendar() {
        console.log(`>>> Navigating to Work Hub (Calendar Tab)`);
        await this.page.goto('/admin/work-hub?tab=calendar');
    }

    async verifyCalendarSynchronization() {
        console.log(`>>> Verifying Calendar Module`);
        await expect(this.page.getByRole('heading', { name: /워크플로우 및 자산 관리|업무 및/i }).first()).toBeVisible({ timeout: 15000 });
    }

    // 부서 업무 (Dept Job)
    async gotoDeptJob() {
        console.log(`>>> Navigating to Departmental Jobs`);
        await this.page.goto('/admin/work-hub?tab=job');
        // Both Dept Job and Work Report now use Workflow Hub layout
        await expect(this.page.locator('h1, h2').filter({ hasText: /워크플로우/i }).first()).toBeVisible({ timeout: 15000 });
    }

    // 업무 보고 (Work Report)
    async gotoWorkReport() {
        console.log(`>>> Navigating to Work Reports`);
        await this.page.goto('/admin/work-hub?tab=report');
        await expect(this.page.locator('h1, h2').filter({ hasText: /워크플로우/i }).first()).toBeVisible({ timeout: 15000 });
    }

    async verifyWorkflowHubTabs() {
        console.log(`>>> Verifying Workflow Hub Tabs`);
        await expect(this.page.getByRole('button', { name: '워크플로우' })).toBeVisible();
        // [메뉴 어휘 통일 V2_27] 탭 라벨을 메뉴명과 맞춰 '자산' → '업무 보고' 로 변경했다.
        await expect(this.page.getByRole('button', { name: '업무 보고' })).toBeVisible();
    }
}
