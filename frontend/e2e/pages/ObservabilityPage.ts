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
        // 허브의 토폴로지는 별도 탭(인프라 토폴로지 맵, tab=topology).
        // [2026-07-27 정정] 종전엔 getByRole('button') 으로 잡았다. 그러나 MonitoringHubClient 의 NavButton 은
        // <button type="button" role="tab"> 이고 **명시적 role 이 암시적 button 역할을 덮어쓴다** — 원리적으로
        // 매칭될 수 없어 5분 타임아웃까지 대기했다. (같은 위험을 BannerAdminClient 는 이미 인지해 role="tab" 을
        // 의도적으로 피하고 주석으로 남겨 뒀다. monitoring 허브는 그 갱신이 누락된 것.)
        await this.page.getByRole('tab', { name: /인프라 토폴로지 맵/i }).first().click();
        const loading = this.page.getByText('Initializing Topology Stream...');
        try {
            await loading.waitFor({ state: 'visible', timeout: 2000 });
            await loading.waitFor({ state: 'hidden', timeout: 30000 });
        } catch (e) {
            console.log('>>> Topology loader not detected or already hidden.');
        }
        // [2026-08-03 계약 전환] 종전엔 'PostgreSQL Primary' 노드가 보이는지를 단언했다.
        //   그 라벨은 NetworkMonitoringApiController 가 **소스에 박아 두고 실시간처럼 돌려주던 가짜
        //   6노드** 중 하나였고, Wave 0(16da54e4c)이 그 거짓 성공을 제거해 GET 이 빈 목록을 반환한다.
        //   즉 이 단언은 "가짜 인프라가 그려지는 것"을 계약으로 동결하고 있었다 — 관리자가 존재하지
        //   않는 노드의 상태를 보고 운영 판단을 하는 상태를 테스트가 보증한 셈이다.
        //   (백엔드 테스트는 그때 함께 고쳤지만 이 E2E 는 놓쳤다. e2e 가 skip 되고 있어 아무도 못 봤다.)
        //
        //   지금 검증해야 하는 계약은 정반대다: **계측 소스가 없으면 다이어그램을 그리지 않는다.**
        await expect(
            this.page.getByText('연동된 토폴로지 계측 소스가 없습니다')
        ).toBeVisible({ timeout: 15000 });

        // 가짜 노드가 되살아나면 red 가 되도록 부재까지 단언한다(정상 상태만 확인하면 회귀를 못 잡는다).
        await expect(this.page.getByText('PostgreSQL Primary')).toHaveCount(0);

        // ⚠ 인프라 노드 관리가 실제로 구현되면 이 테스트는 red 가 된다. 그때 위 두 단언을
        //   '실 노드가 그려진다' 로 바꾼다 — 구현 시점에 테스트가 손을 들게 하는 것이 의도다.
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
