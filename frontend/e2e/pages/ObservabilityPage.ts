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
        // 허브 PageHeader title (MonitoringHubClient.tsx:465)
        const header = this.page.getByText('시스템 인텔리전스 거버넌스').first();
        await header.waitFor({ state: 'visible', timeout: 30000 });
        await expect(header).toBeVisible();
    }

    async verifyMetrics() {
        // 허브 observability 탭의 게이지 지표 (CPU_LOAD/MEMORY_ALLOC/NETWORK_TRAFFIC)
        await this.page.waitForSelector('text=/CPU_LOAD|MEMORY_ALLOC|NETWORK_TRAFFIC/i', { state: 'visible', timeout: 15000 });
        const cards = this.page.locator('div').filter({ hasText: /CPU_LOAD|MEMORY_ALLOC|NETWORK_TRAFFIC/i });
        await expect(cards.first()).toBeVisible();
    }

    async verifyTopology() {
        // 허브의 토폴로지는 별도 탭(인프라 토폴로지 맵, tab=topology)
        await this.page.getByRole('button', { name: /인프라 토폴로지 맵/i }).first().click();
        const loading = this.page.getByText('Initializing Topology Stream...');
        try {
            await loading.waitFor({ state: 'visible', timeout: 2000 });
            await loading.waitFor({ state: 'hidden', timeout: 30000 });
        } catch (e) {
            console.log('>>> Topology loader not detected or already hidden.');
        }
        // 토폴로지 탭의 실제 노드 라벨로 검증 (svg/canvas 존재만으론 lucide 아이콘에 의해 항상 참 → 무의미)
        await expect(this.page.getByText('PostgreSQL Primary')).toBeVisible({ timeout: 15000 });
    }

    async refresh() {
        console.log('[E2E] Clicking data-stream refresh button...');
        const syncBtn = this.page.getByRole('button', { name: /데이터 스트림 새로고침/i });
        await syncBtn.click();
        await this.page.waitForTimeout(1000);
    }

    async exportData() {
        console.log('[E2E] Clicking report snapshot button...');
        const exportBtn = this.page.getByRole('button', { name: /리포트 스냅샷/i });
        await exportBtn.click();
    }
}
