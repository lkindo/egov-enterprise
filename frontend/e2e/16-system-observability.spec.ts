import { test, expect } from './fixtures/base-test';
import { ObservabilityPage } from './pages/ObservabilityPage';

test.describe('Tier 16: System Observability & Intelligence', () => {
    test.use({ storageState: 'playwright/.auth/admin.json' });
    let obsPage: ObservabilityPage;

    test.beforeEach(async ({ page }) => {
        obsPage = new ObservabilityPage(page);
        await obsPage.navigate();
    });

    test('should verify real-time system metrics and header', async () => {
        await obsPage.verifyHeader();
        await obsPage.verifyMetrics();
        
        // Verify specific metrics are visible
        const page = obsPage['page'];
        // 모니터링 허브 observability 탭의 실제 지표 라벨 (구 standalone 페이지 라벨은 라우트 통합으로 제거됨)
        await expect(page.getByText('CPU_LOAD', { exact: false }).first()).toBeVisible();
        await expect(page.getByText('MEMORY_ALLOC', { exact: false }).first()).toBeVisible();
        await expect(page.getByText('NETWORK_TRAFFIC', { exact: false }).first()).toBeVisible();
    });

    // [2026-08-03 개명] 이름이 "토폴로지 시각화를 검증한다" 였는데, 실제로 검증하던 것은
    //   백엔드가 소스에 박아 둔 가짜 노드가 화면에 뜨는지였다. 검증하지 않는 것을 이름으로
    //   주장하지 않는다(0f52e7e06 에서 보안 테스트에 적용한 것과 같은 원칙).
    test('토폴로지 탭은 계측 소스가 없으면 다이어그램을 그리지 않는다 (가짜 노드 부활 차단)', async () => {
        await obsPage.verifyTopology();
    });

    test('should trigger live synchronization and data export', async () => {
        await obsPage.refresh();
        await obsPage.exportData();
        
        // exportData()가 연 '리포트 스냅샷' 모달 검증 (허브 실제 UI — 구 footer 브랜딩은 라우트 통합으로 제거됨)
        const page = obsPage['page'];
        // [2026-08-25] 모달 제목을 한국어로 정정했다(영문 마케팅 명칭 제거).
        await expect(page.getByRole('dialog', { name: '현재 조회 결과 반출' })).toBeVisible();
    });

    test('should verify advanced analytics: visitor and word statistics', async ({ page }) => {
        console.log('>>> [Observability] Navigating to Visitor Stats');
        await page.goto('/admin/stats/user');
        await expect(page.getByText(/사용자 통계 분석/i)).toBeVisible({ timeout: 15000 });
        
        console.log('>>> [Observability] Navigating to Content Stats');
        await page.goto('/admin/stats/board');
        await expect(page.getByText(/콘텐츠 지표 분석/i)).toBeVisible({ timeout: 15000 });
    });
});
