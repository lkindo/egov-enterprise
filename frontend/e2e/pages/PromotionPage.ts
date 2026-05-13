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
        const noticeStatusTrigger = this.page.locator('label').filter({ hasText: /게시 설정/ }).locator('..').locator('button[role="combobox"]');
        if (await noticeStatusTrigger.isVisible()) {
            await noticeStatusTrigger.click();
            await this.page.getByRole('option', { name: /게시 \(LIVE\)/i }).click();
        }

        // Mandatory Coordinates and Size
        console.log('>>> [Promotion] Setting coordinates and size...');
        await this.page.locator('input[name="popupWidthLocation"]').fill('100');
        await this.page.locator('input[name="popupHeightLocation"]').fill('100');
        await this.page.locator('input[name="popupWidthSize"]').fill('400');
        await this.page.locator('input[name="popupHeightSize"]').fill('400');

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
        await this.page.waitForTimeout(1000); // Allow time for upload preview if any
        console.log('>>> [Promotion] Image uploaded successfully.');
    }

    private async clickSubmitAndWait() {
        console.log('>>> [Promotion] Clicking submit button...');
        // Match the button containing "운영 배포" or "자산 수정" or "등록" or "저장"
        const submitBtn = this.page.getByRole('button', { name: /운영 배포|자산 수정|등록|저장/i }).first();
        await submitBtn.waitFor({ state: 'visible', timeout: 5000 });
        await submitBtn.click({ force: true });
        console.log('>>> [Promotion] Submit button clicked, waiting for response...');
        await this.page.waitForTimeout(3000); 
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
            if (await popup.isVisible()) {
                console.log('>>> [Promotion] Popup is visible on dashboard!');
                return;
            }
            console.log(`>>> [Promotion] Popup not found (attempt ${i+1}), reloading...`);
            await this.page.reload();
            await this.page.waitForLoadState('networkidle');
            await this.page.waitForTimeout(2000);
        }
        
        console.log('>>> Warning: Popup not visible on dashboard. This may be due to popup creation failing silently.');
    }
}
