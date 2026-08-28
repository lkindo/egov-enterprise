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
        // [2026-08-24 A1 이행] 밑줄 의사코드 지표 라벨(결재_대기_시퀀스 등)을 업무 문구로 바꿨다(G14).
        //   집계는 결과 툴바에 '조회분 기준 · 대기 N건 · 승인 N건 · 반려 N건'으로 한 줄로 모였다.
        await expect(this.page.getByTestId('work-list-toolbar')).toContainText('조회분 기준');
    }

    /**
     * 첫 대기 건을 승인한다.
     *
     * [2026-08-28] 종전에는 의견 textarea 를 채운 뒤 승인했다. 서버는 승인 시 그 값을
     * 저장하지 않으므로(`InformalSanction.approve()` 가 rjct_rsn_cn 을 null 로 지운다)
     * 화면에서 승인 필수 요구를 걷어냈고, 이 흐름도 사유 없이 승인하도록 맞춘다.
     * 행 버튼 라벨도 '승인 실행' → '결재 처리' 다(모달에서 반려도 고를 수 있으므로).
     */
    async approveFirstPendingSanction() {
        console.log('>>> [Business] Approving first pending sanction');
        const processButton = this.page.getByRole('button', { name: /결재 처리/i }).first();

        if (await processButton.isVisible()) {
            await processButton.click();

            await this.page.getByRole('button', { name: /최종 승인/i }).click();

            await expect(this.page.getByText(/승인 처리했습니다|완료/i)).toBeVisible();
        } else {
            console.warn('>>> [Business] No pending sanctions found to approve.');
        }
    }
}
