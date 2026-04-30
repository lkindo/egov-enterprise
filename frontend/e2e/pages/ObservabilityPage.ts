import { Page, expect } from '@playwright/test';

export class ObservabilityPage {
    constructor(private page: Page) {}

    async navigate() {
        await this.page.goto('/admin/observability');
        await this.page.waitForLoadState('networkidle');
    }

    async verifyHeader() {
        const header = this.page.locator('h1');
        await header.waitFor({ state: 'visible' });
        await expect(header).toContainText(/시스템 통합 관제/i);
    }

    async verifyMetrics() {
        // Wait for ANY of the core metrics to appear (case-insensitive)
        await this.page.waitForSelector('text=/Global API Traffic|System Latency|Error Rate/i', { state: 'visible', timeout: 15000 });
        const cards = this.page.locator('div').filter({ hasText: /Global API Traffic|System Latency|Error Rate/i });
        await expect(cards.first()).toBeVisible();
    }

    async verifyTopology() {
        // The component is dynamic with ssr: false
        const loading = this.page.getByText('Initializing Map...');
        if (await loading.isVisible()) {
            await loading.waitFor({ state: 'hidden', timeout: 30000 });
        }
        // Verify topology content (usually canvas or svg)
        const topology = this.page.locator('.recharts-responsive-container, canvas, svg').first();
        await expect(topology).toBeVisible({ timeout: 15000 });
    }

    async refresh() {
        console.log('[E2E] Clicking Live Sync button...');
        const syncBtn = this.page.getByRole('button', { name: /Live Sync/i });
        await syncBtn.click();
        await this.page.waitForTimeout(1000);
    }

    async exportData() {
        console.log('[E2E] Clicking Data Export button...');
        const exportBtn = this.page.getByRole('button', { name: /데이터 익스포트/i });
        await exportBtn.click();
        // Since it's a mock action in the UI, we just verify clickability
    }
}
