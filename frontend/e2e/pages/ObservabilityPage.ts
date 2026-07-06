import { Page, expect } from '@playwright/test';

export class ObservabilityPage {
    constructor(private page: Page) {}

    async navigate() {
        await this.page.goto('/admin/observability');
        await this.verifyHeader();
    }

    async verifyHeader() {
        const header = this.page.getByRole('heading', { name: '시스템 통합 관제' }).first();
        await header.waitFor({ state: 'visible' });
        await expect(header).toBeVisible();
    }

    async verifyMetrics() {
        // Wait for ANY of the core metrics to appear (case-insensitive)
        await this.page.waitForSelector('text=/글로벌 트래픽|시스템 지연시간|에러 발생률/i', { state: 'visible', timeout: 15000 });
        const cards = this.page.locator('div').filter({ hasText: /글로벌 트래픽|시스템 지연시간|에러 발생률/i });
        await expect(cards.first()).toBeVisible();
    }

    async verifyTopology() {
        // The component is dynamic with ssr: false
        // We wait for the loading indicator to disappear if it shows up
        const loading = this.page.getByText('Initializing Map...');
        try {
            // Use a short wait first to see if it even appears, then wait for it to hide
            await loading.waitFor({ state: 'visible', timeout: 2000 });
            await loading.waitFor({ state: 'hidden', timeout: 30000 });
        } catch (e) {
            // If it never appeared within 2s, it's likely already loaded
            console.log('>>> Loading indicator not detected or already hidden.');
        }

        // Verify topology content
        const topology = this.page.locator('div').filter({ hasText: /System Map/i }).first();
        await expect(topology).toBeVisible({ timeout: 15000 });
        
        // Also verify at least one node is present (using a more flexible regex)
        const node = this.page.getByText(/Global Traffic|Edge Network|Gateway|App Nodes|Primary DB|System Latency|Error Rate/i).first();
        await expect(node).toBeVisible({ timeout: 15000 });
    }

    async refresh() {
        console.log('[E2E] Clicking Live Sync button...');
        const syncBtn = this.page.getByRole('button', { name: /실시간 동기화/i });
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
