import { Page, expect } from '@playwright/test';

/**
 * Process Studio (Workflow) admin POM.
 *
 * Route note: next.config.ts redirects the legacy /admin/sanctn/workflow -> /admin/workflow.
 * The destination renders WorkflowClient ("프로세스 설계 및 관제" / Process Studio), which is a
 * canvas-based process designer. It has NO tabs, form inventory, engine-status sidebar, or deploy
 * button — those belonged to the old WorkflowHubClient at the now-redirected route. Selectors below
 * target the actual WorkflowClient structure: the PageHeader title, hub metric cards, the
 * WorkflowCanvas nodes, and the "노드 인텔리전스" (Node Intelligence) side panel.
 */
export class WorkflowAdminPage {
    readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    async goto() {
        console.log('[E2E] Navigating to Workflow Process Studio (/admin/workflow)...');
        await this.page.goto('/admin/workflow', { waitUntil: 'load' });
        await expect(this.page.getByRole('heading', { name: '프로세스 설계 및 관제', exact: true }))
            .toBeVisible({ timeout: 15000 });
    }

    /** Verifies the studio shell rendered: hub metric cards + canvas/panel section cards. */
    async verifyHubLoaded() {
        console.log('[E2E] Verifying Process Studio hub shell...');
        await expect(this.page.getByText('샘플 활성 설계', { exact: true })).toBeVisible({ timeout: 10000 });
        await expect(this.page.getByText('샘플 실행 중', { exact: true })).toBeVisible();
        await expect(this.page.getByText('샘플 성공률', { exact: true })).toBeVisible();
        await expect(this.page.getByText('샘플 시스템 부하', { exact: true })).toBeVisible();
        await expect(this.page.getByRole('heading', { name: '프로세스 캔버스' })).toBeVisible();
        await expect(this.page.getByRole('heading', { name: '노드 인텔리전스' })).toBeVisible();
    }

    /** Clicks a process node on the WorkflowCanvas by its label. */
    async selectNode(nodeLabel: string) {
        console.log(`[E2E] Selecting workflow canvas node: ${nodeLabel}`);
        // Canvas nodes are the only `cursor-pointer` divs (workflow-canvas.tsx:109).
        const node = this.page.locator('div.cursor-pointer').filter({ hasText: nodeLabel }).first();
        await expect(node).toBeVisible({ timeout: 10000 });
        await node.click();
    }

    /**
     * Asserts the "노드 인텔리전스" side panel reflects the selected node.
     * The panel renders the node label as an <h4> (role=heading), distinct from the canvas <p>
     * label, so a role-based lookup uniquely targets the panel and avoids strict-mode collisions.
     */
    async verifyNodeIntelligence(nodeLabel: string) {
        console.log(`[E2E] Verifying Node Intelligence panel for: ${nodeLabel}`);
        const panelHeading = this.page.getByRole('heading', { name: nodeLabel });
        await expect(panelHeading).toBeVisible({ timeout: 10000 });
        await expect(this.page.getByText('Assignee_Node')).toBeVisible();
    }
}
