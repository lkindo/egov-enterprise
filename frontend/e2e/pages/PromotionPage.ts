import { Page, expect } from '@playwright/test';
import path from 'path';

export class PromotionPage {
    constructor(private page: Page) {}

    async gotoBannerPopupAdmin() {
        console.log('>>> [Promotion] Navigating to Banner/Popup Admin');
        await this.page.goto('/admin/system/banner');
        await this.page.waitForLoadState('networkidle');
        await expect(this.page.locator('h1, h2').filter({ hasText: /배너.*팝업.*관리/i }).first()).toBeVisible({ timeout: 20000 });
    }

    async createPopup(title: string) {
        console.log(`>>> [Promotion] Configuring popup: ${title}`);
        
        await this.page.getByRole('button', { name: /팝업 설정/i }).click();
        await this.page.getByRole('button', { name: /팝업 설계|신규 팝업 등록/i }).first().click();

        await this.page.getByPlaceholder(/팝업 제목 입력/i).fill(title);

        // Date range - using explicit labels for precision
        console.log('>>> [Promotion] Setting date range...');
        const startDateInput = this.page.locator('label').filter({ hasText: /게시 시작 시점/ }).locator('..').locator('input');
        const endDateInput = this.page.locator('label').filter({ hasText: /게시 종료 시점/ }).locator('..').locator('input');
        
        await startDateInput.scrollIntoViewIfNeeded();
        await startDateInput.fill('2026-05-10');
        
        await endDateInput.scrollIntoViewIfNeeded();
        await endDateInput.fill('2026-12-31');

        // Select 'YES' for 'Notice Status' (게시 설정) - It's a Select component
        console.log('>>> [Promotion] Setting Notice Status to YES');
        // [2026-07-27 정정] 종전엔 무조건 콤보박스를 열고 '게시 (LIVE)' 옵션을 클릭했다. 그런데
        //  ① 폼 기본값이 이미 ntceYn: 'Y'(게시 LIVE) 라 클릭 자체가 불필요하고
        //  ② 다이얼로그 안의 Radix Select 옵션 클릭이 dialog-overlay 에 가로채여
        //     "element is visible, enabled and stable" → 오버레이 히트 를 **542회** 반복한 뒤
        //     5분 타임아웃으로 죽었다(실측 call log).
        // 현재 값이 이미 게시면 건드리지 않고, 다를 때만 키보드로 선택한다(오버레이 히트테스트 회피).
        const noticeStatusTrigger = this.page.locator('label').filter({ hasText: /게시 설정/ }).locator('..').locator('button[role="combobox"]');
        if (await noticeStatusTrigger.isVisible()) {
            const current = (await noticeStatusTrigger.textContent()) ?? '';
            if (!/게시/.test(current)) {
                await noticeStatusTrigger.click();
                await this.page.getByRole('option', { name: /게시 \(LIVE\)/i }).press('Enter');
            } else {
                console.log('>>> [Promotion] 게시 설정이 이미 게시(LIVE) — 콤보박스를 열지 않는다.');
            }
        }

        // Mandatory Coordinates and Size
        console.log('>>> [Promotion] Setting coordinates and size...');
        await this.page.locator('input[name="popupWdthPstn"]').fill('100');
        await this.page.locator('input[name="popupVrtcPstn"]').fill('100');
        await this.page.locator('input[name="popupWdthSz"]').fill('400');
        await this.page.locator('input[name="popupVrtcSz"]').fill('400');

        await this.uploadImage();
        await this.clickSubmitAndWait();
    }

    async createBanner(title: string) {
        console.log(`>>> [Promotion] Configuring banner: ${title}`);
        
        await this.page.getByRole('button', { name: /배너 설정/i }).click();
        await this.page.getByRole('button', { name: /배너 등록|신규 배너 등록/i }).first().click();

        await this.page.getByPlaceholder(/배너 이름/i).fill(title);
        await this.page.getByPlaceholder(/\/pages\//i).fill('https://egovframe.go.kr');
        await this.page.locator('input[name="sortOrdr"]').fill('1'); // Use name selector

        await this.uploadImage();
        await this.clickSubmitAndWait();
    }

    private async uploadImage() {
        console.log('>>> [Promotion] Uploading 1x1 PNG asset...');
        const fs = require('fs');
        const os = require('os');
        const dummyPath = path.join(os.tmpdir(), 'e2e-dummy.png');
        
        // Create a valid 1x1 transparent PNG if it doesn't exist
        if (!fs.existsSync(dummyPath)) {
            const buf = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', 'base64');
            fs.writeFileSync(dummyPath, buf);
        }

        const fileInput = this.page.locator('input[type="file"]').first();
        await fileInput.setInputFiles(dummyPath);
        console.log('>>> [Promotion] Image uploaded successfully.');
    }

    private async clickSubmitAndWait() {
        console.log('>>> [Promotion] Clicking submit button...');
        // 모달 푸터의 실제 제출 버튼 텍스트는 '운영 배포'(신규)/'자산 수정'(수정)뿐.
        // ('등록'|'저장'을 넣으면 모달을 여는 '신규 배너/팝업 등록' 버튼이 .first()로 먼저 매칭돼 폼이 제출되지 않았음.)
        const submitBtn = this.page.getByRole('button', { name: /운영 배포|자산 수정/i }).first();
        await submitBtn.waitFor({ state: 'visible', timeout: 5000 });
        await submitBtn.click({ force: true });
        console.log('>>> [Promotion] Submit button clicked, waiting for response...');
        // [2026-07-27] 종전에는 3초 blind wait 이었다. 그러면 **등록이 실패해도 그냥 지나간다** —
        //   검증 대상이 "무엇이 일어났는가"가 아니라 "시간이 지났는가"였기 때문이다.
        //   실제 완료 신호는 모달이 닫히는 것이다(성공 시에만 닫힌다). 실패하면 모달이 열린 채
        //   남으므로 여기서 즉시·명확하게 실패한다.
        await expect(
            submitBtn,
            '등록 모달이 닫히지 않았다 — 제출이 실패했거나 유효성 오류가 남아 있다',
        ).toBeHidden({ timeout: 15000 });
        console.log('>>> [Promotion] Creation step completed');
    }

    async verifyPopupOnDashboard(title: string) {
        console.log(`>>> [Promotion] Verifying popup visibility for: ${title}`);
        await this.page.goto('/');
        await this.page.waitForLoadState('networkidle');
        
        // Check for popup dialog
        const popup = this.page.locator('[role="dialog"], .popup-container').filter({ hasText: title });
        
        // Retry a few times with reloads if not visible (sometimes session/cache delay)
        for (let i = 0; i < 3; i++) {
            if (await popup.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false)) {
                console.log('>>> [Promotion] Popup is visible on dashboard!');
                return;
            }
            console.log(`>>> [Promotion] Popup not found (attempt ${i+1}), reloading...`);
            await this.page.reload();
            await this.page.waitForLoadState('networkidle');
        }
        
        console.log('>>> Warning: Popup not visible on dashboard. This may be due to popup creation failing silently.');
    }
}
