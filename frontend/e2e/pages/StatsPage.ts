import { Page, expect } from '@playwright/test';

export class StatsPage {
    constructor(private page: Page) {}

    async goto() {
        console.log('>>> Navigating to Intelligence Stats Dashboard');
        await this.page.goto('/admin/stats');
        await expect(this.page.getByRole('heading', { name: /인텔리전스 시스템 아키텍처 분석/i })).toBeVisible();
    }

    async refresh() {
        console.log('>>> Refreshing stats data');
        await this.page.getByRole('button').filter({ has: this.page.locator('svg.animate-spin, svg:not(.animate-spin)') }).filter({ has: this.page.locator('path') }).first().click();
        // The refresh button has RefreshCcw icon. In AdminStatsClient.tsx line 144
    }

    async changePeriod(period: string) {
        console.log(`>>> Changing period to: ${period}`);
        await this.page.getByLabel(/통계 조회 기간 선택/i).selectOption({ label: period });
    }

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
        await expect(this.page.getByText(/NETWORK TRAFFIC EVOLUTION/i)).toBeVisible();
        await expect(this.page.getByText(/ENVIRONMENT DISTRIBUTION/i)).toBeVisible();
        await expect(this.page.getByText(/HIGH-INTERACTION SERVICES/i)).toBeVisible();
    }
}
