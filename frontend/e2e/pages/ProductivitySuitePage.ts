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

    async verifyApprovalFormHeading() {
        console.log(`>>> Verifying Approval Form Demo Heading`);
        // 이 화면의 계약은 결재 양식 데모 제목이다. 실제 결재는 approvals 여정이 검증한다.
        await expect(this.page.getByRole('heading', { name: /결재|결재 양식|Sanction/i }).first()).toBeVisible({ timeout: 15000 });
    }

    async verifyWorkflowHubTabs() {
        console.log(`>>> Verifying Workflow Hub Tabs`);
        await expect(this.page.getByRole('button', { name: '워크플로우' })).toBeVisible();
        // [메뉴 어휘 통일 V2_27] 탭 라벨을 메뉴명과 맞춰 '자산' → '업무 보고' 로 변경했다.
        await expect(this.page.getByRole('button', { name: '업무 보고' })).toBeVisible();
    }
}
