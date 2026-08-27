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

    /**
     * 사용자·조직 허브의 정책 탭으로 이동한다.
     *
     * [2026-08-27 목적지 교정] 종전에는 /admin/user/login-policy 가 모니터링 허브로 리다이렉트되고
     * 그 허브의 별칭이 ?tab=policy 를 LOGIN(로그인 **로그** 목록)으로 떨어뜨렸다. 즉 이 page object
     * 는 **틀린 목적지를 계약으로 고정**하고 있었다. 이 alias 의 정본은 page.tsx 가 실제로 렌더하는
     * UserOrgHubClient(defaultTab="POLICIES") = /admin/user/indvdl-info-policy 다.
     */
    async gotoLoginPolicy() {
        console.log(`>>> Navigating to user policy tab (alias → /admin/user/indvdl-info-policy)`);
        await this.page.goto('/admin/user/login-policy');
        await expect(this.page).toHaveURL(/\/admin\/user\/indvdl-info-policy/);
    }

    async verifyPolicyTab() {
        console.log(`>>> Verifying the policies tab is selected in the user/org hub`);
        // UserOrgHubClient 의 NavButton 은 role="tab" 이 아니라 aria-current="page" 로 현재 탭을
        // 표시한다(실측). role 을 가정하면 CI 에서만 못 찾는다.
        // 탭이 실제로 선택됐는지를 본다 — 텍스트 가시성보다 강한 단언이다.
        await expect(this.page.getByRole('button', { name: '조직 정책' }))
            .toHaveAttribute('aria-current', 'page');
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
