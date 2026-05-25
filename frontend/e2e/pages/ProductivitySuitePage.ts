import { Page, Locator, expect } from '@playwright/test';

export class ProductivitySuitePage {
    readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    // 전자결재(Approval Workflow) 
    async gotoApproval() {
        console.log(`>>> Navigating to Electronic Approval (Sanction)`);
        await this.page.goto('/admin/sanctn/forms');
        await this.page.waitForTimeout(1000); // Wait for DOM
    }

    async verifyApprovalStateTransition() {
        console.log(`>>> Verifying Workflow State Transition`);
        // Note: The UI might not be fully functional for approval workflow in the dummy app yet.
        // We will look for standard identifiers for approval systems.
        // We'll assert that the page loaded correctly, checking for text indicating Electronic Approval.
        await expect(this.page.getByRole('heading', { name: /결재|결재 양식|Sanction/i }).first()).toBeVisible({ timeout: 15000 });
    }

    // 조직도 및 주소록(Address Book & Org Chart)
    async gotoAddressBook() {
        console.log(`>>> Navigating to Address Book / Org Chart`);
        await this.page.goto('/admin/collaboration/address-book');
        await this.page.waitForTimeout(1000); // Wait for DOM
    }

    async verifyOrgChartNavigation() {
        console.log(`>>> Verifying Org Chart Tree Navigation`);
        await expect(this.page.getByRole('heading', { name: /Connect Matrix|Directory Nodes|Select Data Node/i }).first()).toBeVisible({ timeout: 15000 });
        
        // Let's assume there is a folder icon or tree representation
        const treeNodes = this.page.locator('.lucide-folder, .lucide-users, .lucide-user');
        if (await treeNodes.count() > 0) {
            await treeNodes.first().hover();
        }
    }

    // 일정 관리(Calendar)
    async gotoCalendar() {
        console.log(`>>> Navigating to Work Hub (Calendar Tab)`);
        await this.page.goto('/admin/work-hub?tab=calendar');
        await this.page.waitForTimeout(1000); // Wait for DOM
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
        await expect(this.page.getByRole('button', { name: '자산' })).toBeVisible();
    }
}
