import { Page,  expect } from '@playwright/test';

export class WorkflowAdminPage {
    readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    async goto() {
        console.log('[E2E] Navigating to Workflow Admin Hub...');
        await this.page.goto('/admin/sanctn/workflow', { waitUntil: 'load' });
        await expect(this.page.locator('h2').filter({ hasText: '전자결재 워크플로우 허브' })).toBeVisible({ timeout: 15000 });
    }

    async switchTab(tab: 'FORMS' | 'WORKFLOW' | 'MONITOR') {
        console.log(`[E2E] Switching to tab: ${tab}`);
        let label = '';
        switch(tab) {
            case 'FORMS': label = 'Sanction Forms'; break;
            case 'WORKFLOW': label = '워크플로우'; break;
            case 'MONITOR': label = '시스템'; break;
        }
        const tabBtn = this.page.getByRole('button', { name: label }).first();
        await expect(tabBtn).toBeVisible({ timeout: 10000 });
        await tabBtn.click({ force: true });
        
        // Wait for state update and visual transition
        await this.page.waitForTimeout(1500); 
    }

    async selectForm(formTitle: string) {
        console.log(`[E2E] Selecting approval form: ${formTitle}`);
        const formItem = this.page.locator('div.group').filter({ hasText: formTitle }).first();
        await expect(formItem).toBeVisible();
        await formItem.click();
    }

    async verifyDesignerVisible(formTitle: string) {
        console.log(`[E2E] Verifying designer preview for: ${formTitle}`);
        const designerHeader = this.page.locator('h2').filter({ hasText: formTitle }).last();
        await expect(designerHeader).toBeVisible({ timeout: 10000 });
        
        // Check for workflow nodes
        const nodes = this.page.locator('div').filter({ hasText: /기안자|관리자|담당자|시스템/ });
        await expect(nodes.first()).toBeVisible();
    }

    async deployWorkflow() {
        console.log('[E2E] Clicking Workflow Deployment button...');
        const deployBtn = this.page.getByRole('button', { name: '워크플로우 배포' });
        await expect(deployBtn).toBeEnabled();
        await deployBtn.click();
    }
}
