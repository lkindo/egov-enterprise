import { Page, expect } from '@playwright/test';

export class StatsPage {
    constructor(private page: Page) {}

    async goto() {
        console.log('>>> Navigating to Intelligence Stats Dashboard');
        await this.page.goto('/admin/stats');
        // [2026-08-22 정정] 화면 제목이 '인텔리전스 시스템 아키텍처 분석' → '관리자 통계' 로
        //   개편됐다(AdminStatsClient.tsx:107, 정직성 개편). 실제 문자열로 좁혀 단언한다.
        await expect(this.page.getByRole('heading', { name: '관리자 통계', exact: true })).toBeVisible();
    }

    async refresh() {
        console.log('>>> Refreshing stats data');
        await this.page.locator('button[aria-label="새로고침"]').click();
    }

    // [2026-07-27 삭제] changePeriod(period) — '통계 조회 기간 선택' 셀렉트를 조작하던 메서드.
    //   그 셀렉트는 onChange 도 value 도 없는 **장식 컨트롤**이었고(옵션 REALTIME_FLOW/MONTHLY_BATCH/
    //   QUARTERLY_ANALYSIS 를 골라도 조회 조건이 바뀌지 않았다), 관리자 전수감사 P0 '거짓 성공 제거'
    //   에서 제거됐다(커밋 4dcee3014). 따라서 이 메서드는 **가짜 컨트롤을 조작하며 통과하던 단언**이다.
    //   화면을 되돌려 테스트를 살리는 것은 거짓 UI 를 되살리는 일이므로 메서드째 걷어낸다.
    //   ※ 백엔드 GET /statistics/connect 와 StatsAdminService 는 fromDate/toDate 를 이미 받는다.
    //     '진짜' 기간 필터 UI 도입은 제품 결정 사항이며, 그때 이 POM 에 다시 추가한다.

    async exportExcel() {
        console.log('>>> Exporting stats to Excel');
        const [download] = await Promise.all([
            this.page.waitForEvent('download'),
            this.page.getByRole('button', { name: /엑셀 내보내기/i }).click()
        ]);
        return download;
    }

    async verifyChartsVisible() {
        console.log('>>> Verifying chart components are rendered');
        // [2026-07-27 정정] 종전에는 'NETWORK TRAFFIC EVOLUTION'·'ENVIRONMENT DISTRIBUTION'·
        // 'HIGH-INTERACTION SERVICES' 영문 라벨을 기다렸다. 화면이 한글화되며 세 문자열이 전부
        // 사라졌고, 그중 '지리적 트래픽 분포' 카드는 하드코딩 목 데이터를 실측치처럼 표기하던
        // 것이라 감사 P1-5 로 **의도적으로 삭제**됐다(AdminStatsClient 주석 참조).
        // 즉 실패는 앱 회귀가 아니라 테스트 드리프트다 — 현행 화면 구성으로 단언을 옮긴다.
        // [2026-08-22 정정] '네트워크 트래픽 진화' → '일자별 접속 추이'(AdminStatsClient.tsx:172).
        await expect(this.page.getByRole('heading', { name: '일자별 접속 추이' })).toBeVisible();
        // 섹션 제목만으로는 차트 자체가 떴는지 증명되지 않는다 — 차트 래퍼 제목까지 확인한다.
        await expect(this.page.getByRole('heading', { name: '일자별 접속 건수 추이' })).toBeVisible();
        // 차트의 원본 수치를 싣는 표 섹션(엑셀 내보내기 대상)도 함께 렌더되어야 한다.
        await expect(this.page.getByRole('heading', { name: '일자별 접속 통계' })).toBeVisible();
    }
}
