import { Page, expect } from '@playwright/test';

export class ObservabilityPage {
    constructor(private page: Page) {}

    // 라우트 통합: /admin/observability → /admin/system/monitoring/hub?tab=observability (next.config redirect).
    // POM을 모니터링 허브(MonitoringHubClient) 구조에 맞게 정합.
    async navigate() {
        await this.page.goto('/admin/system/monitoring/hub?tab=observability');
        await this.verifyHeader();
    }

    async verifyHeader() {
        // 관측 탭 자체의 작업 제목으로 진입을 확인한다.
        const header = this.page.getByRole('heading', { level: 1, name: '가동 상태', exact: true });
        await header.waitFor({ state: 'visible', timeout: 30000 });
        await expect(header).toBeVisible();
    }

    async verifyMetrics() {
        // 허브 observability 탭의 게이지 지표 (CPU_LOAD/MEMORY_ALLOC/NETWORK_TRAFFIC)
        await this.page.waitForSelector('text=/CPU_LOAD|MEMORY_ALLOC|NETWORK_TRAFFIC/i', { state: 'visible', timeout: 15000 });
        const cards = this.page.locator('div').filter({ hasText: /CPU_LOAD|MEMORY_ALLOC|NETWORK_TRAFFIC/i });
        await expect(cards.first()).toBeVisible();
    }

    async refresh() {
        console.log('[E2E] Clicking data-stream refresh button...');
        const syncBtn = this.page.getByRole('button', { name: /현재 탭 새로고침/i });
        await Promise.all([
            this.page.waitForResponse((response) =>
                /\/actuator\/health(?:\?|$)/.test(response.url()) && response.request().method() === 'GET',
            ),
            syncBtn.click(),
        ]);
    }

    async exportData() {
        console.log('[E2E] Clicking report snapshot button...');
        const exportBtn = this.page.getByRole('button', { name: /리포트 스냅샷/i });
        await exportBtn.click();
    }
}
