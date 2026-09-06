import { Page, expect } from '@playwright/test';

export class BusinessExtensionPage {
    readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    /**
     * [2026-09-06 DEC-OPS-040] `/admin/system/ism` 은 정본 결재 허브(`/approvals`)로의 page-redirect 별칭이 됐다
     * (DEC-OPS-039 제안의 owner 승인). 종전 이 메서드는 약식 결재 화면의 문구를 기다렸지만 그 화면은 사라졌으므로,
     * 별칭 진입이 정본 허브에 도달하는지를 본다. 결재 완주(상신→대기함→승인→처리함)는 11-enterprise-workflow 가 검증한다.
     */
    async gotoIsm() {
        console.log('>>> [Business] Navigating to ISM alias (redirects to the approval hub)');
        await this.page.goto('/admin/system/ism');
        await expect(this.page).toHaveURL(/\/approvals(?:[?#]|$)/, { timeout: 15000 });
        await expect(this.page.getByRole('heading', { level: 1, name: '결재 허브' })).toBeVisible({ timeout: 15000 });
    }

    async gotoHpcm() {
        console.log('>>> [Business] Navigating to Help Content Management (HPCM)');
        await this.page.goto('/admin/system/hpcm');
        await expect(this.page.getByRole('heading', {
            level: 1,
            name: '도움말 콘텐츠 관리(HPCM)',
        })).toBeVisible({ timeout: 15000 });
    }
}
