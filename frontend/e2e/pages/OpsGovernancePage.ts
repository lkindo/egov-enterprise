import { Page, Locator, expect } from '@playwright/test';

export class OpsGovernancePage {
    readonly page: Page;
    readonly roleSelectTrigger: Locator;
    readonly roleSelectContent: Locator;

    constructor(page: Page) {
        this.page = page;

        // Menu by Authority selectors
        this.roleSelectTrigger = page.locator('button[role="combobox"]').filter({ hasText: '보안 역할' }).or(page.locator('button[role="combobox"]'));
        this.roleSelectContent = page.locator('[role="listbox"]');
    }

    async gotoLoginPolicy() {
        console.log(`>>> Navigating to Login Policy (redirects to Monitoring Hub)`);
        // next.config.ts redirects /admin/user/login-policy → /admin/system/monitoring/hub?tab=policy
        // (MonitoringHubClient, where tab=policy maps to the LOGIN / '인증 접속 히스토리' view)
        await this.page.goto('/admin/user/login-policy');
        await expect(this.page.getByRole('heading', { name: '시스템 인텔리전스 거버넌스' })).toBeVisible();
    }

    async verifyPolicyTab() {
        console.log(`>>> Verifying policy tab content in Monitoring Hub`);
        // tab=policy resolves to the LOGIN nav ('인증 접속 히스토리') inside the monitoring hub
        await expect(this.page.getByText('인증 접속 히스토리')).toBeVisible();
        // The central investigation data stream panel confirms the hub rendered
        await expect(this.page.getByText('인베스티게이션')).toBeVisible();
    }

    async gotoMenuByAuthority() {
        console.log(`>>> Navigating to Menu By Authority`);
        await this.page.goto('/admin/system/menus/by-authority');
        await expect(this.page.getByText('권한 기반 메뉴 거버넌스')).toBeVisible();
    }

    async verifyMenuRoleMapping(roleName: string) {
        console.log(`>>> Selecting role: ${roleName}`);
        
        // Wait for combobox
        await this.roleSelectTrigger.first().waitFor({ state: 'visible' });
        await this.roleSelectTrigger.first().click();
        
        // Select the role
        const roleOption = this.page.getByRole('option', { name: new RegExp(roleName, 'i') });
        await roleOption.click();
        
        // Wait for tree to load
        console.log(`>>> Verifying menu tree for role`);
        await expect(this.page.getByText(/시스템 메뉴|기능 노드 트리/i)).toBeVisible();
        
        // Check that either nodes are rendered or the "no menus" message is visible
        const nodeIcons = this.page.locator('.lucide-folder, .lucide-file');
        const emptyState = this.page.getByText('할당된 메뉴 없음');
        await expect(nodeIcons.first().or(emptyState)).toBeVisible({ timeout: 10000 });
    }
}
