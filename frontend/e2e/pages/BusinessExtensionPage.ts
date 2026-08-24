import { Page, expect } from '@playwright/test';

export class BusinessExtensionPage {
    readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    async gotoIsm() {
        console.log('>>> [Business] Navigating to Informal Sanction Hub (ISM)');
        await this.page.goto('/admin/system/ism');
        await expect(this.page.getByText(/인포멀 생션 아키텍처|약식결재/i).first()).toBeVisible({ timeout: 15000 });
    }

    async gotoHpcm() {
        console.log('>>> [Business] Navigating to Help Content Management (HPCM)');
        await this.page.goto('/admin/system/hpcm');
        await expect(this.page.getByRole('heading', {
            level: 1,
            name: '도움말 콘텐츠 관리(HPCM)',
        })).toBeVisible({ timeout: 15000 });
    }

    async verifyIsmMetrics() {
        console.log('>>> [Business] Verifying ISM Metrics');
        await expect(this.page.getByText(/결재_대기_시퀀스|승인_자산_수/i).first()).toBeVisible();
    }

    async approveFirstPendingSanction(opinion: string) {
        console.log('>>> [Business] Approving first pending sanction');
        const approveButton = this.page.getByRole('button', { name: /승인 실행/i }).first();
        
        if (await approveButton.isVisible()) {
            await approveButton.click();
            
            // Opinion field
            const opinionInput = this.page.locator('textarea[placeholder*="의견"]').first();
            await opinionInput.waitFor({ state: 'visible' });
            await opinionInput.fill(opinion);
            
            // Confirm button
            await this.page.getByRole('button', { name: /최종 승인/i }).click();
            
            // Toast verify
            await expect(this.page.getByText(/성공적으로 승인|완료/i)).toBeVisible();
        } else {
            console.warn('>>> [Business] No pending sanctions found to approve.');
        }
    }
}
