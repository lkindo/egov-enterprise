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
        // Check for the presence of the topology container or its version tag
        const tag = this.page.getByText(/System Map/i);
        await tag.waitFor({ state: 'visible', timeout: 15000 });
        await expect(tag).toBeVisible();
    }
}
