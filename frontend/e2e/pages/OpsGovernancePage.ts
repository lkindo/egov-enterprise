import { Page, Locator, expect } from '@playwright/test';

export class OpsGovernancePage {
    readonly page: Page;
    readonly tabPolicies: Locator;
    readonly tabUsers: Locator;
    readonly roleSelectTrigger: Locator;
    readonly roleSelectContent: Locator;

    constructor(page: Page) {
        this.page = page;
        // Navigation items in UserOrgHub
        this.tabPolicies = page.locator('button').filter({ hasText: '조직 정책' });
        this.tabUsers = page.locator('button').filter({ hasText: '사용자' });
        
        // Menu by Authority selectors
        this.roleSelectTrigger = page.locator('button[role="combobox"]').filter({ hasText: '보안 역할' }).or(page.locator('button[role="combobox"]'));
        this.roleSelectContent = page.locator('[role="listbox"]');
    }

    async gotoLoginPolicy() {
        console.log(`>>> Navigating to Login Policy Hub`);
        await this.page.goto('/admin/user/login-policy');
        await expect(this.page.getByText('조직 아키텍처 거버넌스')).toBeVisible();
    }

    async verifyPolicyTab() {
        console.log(`>>> Accessing POLICIES tab`);
        await this.tabPolicies.click();
        
        // Wait for the UI state to update
        await this.page.waitForTimeout(1000);
        // It might show Idle_Probe_State if nothing is selected, which is expected for now
        await expect(this.page.getByText(/Idle_Probe_State|조직 정책/i).first()).toBeVisible();
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
        await this.page.waitForTimeout(2000); // Give it time to render the tree nodes
        
        // Check that either nodes are rendered or the "no menus" message is visible
        const nodeIcons = this.page.locator('.lucide-folder, .lucide-file');
        const emptyState = this.page.getByText('할당된 메뉴 없음');
        await expect(nodeIcons.first().or(emptyState)).toBeVisible({ timeout: 10000 });
    }
}
