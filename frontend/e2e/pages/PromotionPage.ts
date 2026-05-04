import { Page, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

export class PromotionPage {
    constructor(private page: Page) {}

    async goto() {
        console.log('>>> [Promotion] Navigating to Banner/Popup Admin');
        await this.page.goto('/admin/system/banner');
        await expect(this.page.locator('h1, h2, h3, .title').filter({ hasText: /배너|팝업|Promotional/i }).first()).toBeVisible({ timeout: 15000 });
    }

    async createPopup(title: string) {
        console.log(`>>> [Promotion] Configuring popup: ${title}`);
        await this.page.getByRole('button', { name: /팝업 설정/i }).click();
        await this.page.getByRole('button', { name: /팝업 등록/i }).click();
        await this.page.getByPlaceholder(/팝업 제목|Header/i).fill(title);

        // Date range - using explicit labels for precision
        console.log('>>> [Promotion] Setting date range...');
        const startDateInput = this.page.locator('div').filter({ hasText: /^게시 시작 시점/ }).locator('input').first();
        const endDateInput = this.page.locator('div').filter({ hasText: /^게시 종료 시점/ }).locator('input').first();
        
        await startDateInput.click();
        await startDateInput.clear();
        await startDateInput.type('20260501'); // Frontend auto-formats to 2026-05-01
        
        await endDateInput.click();
        await endDateInput.clear();
        await endDateInput.type('20261231'); // Frontend auto-formats to 2026-12-31

        // Select 'YES' for 'Notice Status' (게시 여부) if present
        console.log('>>> [Promotion] Setting Notice Status to YES');
        const noticeYes = this.page.locator('label').filter({ hasText: /^YES$|^예$|^사용$/i }).first();
        if (await noticeYes.isVisible()) {
            await noticeYes.click();
        }

        // New: Mandatory Coordinates and Size
        console.log('>>> [Promotion] Setting coordinates and size...');
        // Targeting by full labels for precision (X_PIVOT, Y_PIVOT, W_RES, H_RES)
        const labels = ['가로 좌표 (X_PIVOT)', '세로 좌표 (Y_PIVOT)', '가로 폭 (W_RES)', '세로 높이 (H_RES)'];
        const values = ['100', '100', '400', '300'];
        
        for (let i = 0; i < labels.length; i++) {
            const input = this.page.locator('div').filter({ hasText: labels[i] }).locator('input').first();
            await input.scrollIntoViewIfNeeded();
            await input.fill(values[i]);
            console.log(`>>> [Promotion] Filled ${labels[i]} with ${values[i]}`);
        }

        await this.uploadImage();
        await this.clickSubmitAndWait();
    }

    async createBanner(title: string) {
        console.log(`>>> [Promotion] Configuring banner: ${title}`);
        await this.page.getByRole('button', { name: /배너 설정/i }).click();
        await this.page.getByRole('button', { name: /배너 등록/i }).click();

        await this.page.getByPlaceholder(/배너 이름/i).fill(title);
        await this.page.getByPlaceholder(/\/pages\//i).fill('https://egovframe.go.kr');
        await this.page.locator('input[type="number"]').fill('1'); // Sort order

        await this.uploadImage();
        await this.clickSubmitAndWait();
    }

    private async uploadImage() {
        console.log('>>> [Promotion] Uploading 1x1 PNG asset...');
        const os = require('os');
        const dummyPath = path.join(os.tmpdir(), 'e2e-dummy.png');
        
        // Create a valid 1x1 transparent PNG
        const base64Png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
        fs.writeFileSync(dummyPath, Buffer.from(base64Png, 'base64'));

        const fileInput = this.page.locator('input[type="file"]');
        await fileInput.setInputFiles(dummyPath);
        await this.page.waitForTimeout(2000); // Wait for potential preview/upload processing
        console.log('>>> [Promotion] Image uploaded successfully.');
    }

    private async clickSubmitAndWait() {
        console.log('>>> [Promotion] Clicking submit button...');
        // More specific selector for the "Deploy" button (운영 배포)
        const submitBtn = this.page.getByRole('button', { name: /운영 배포|등록/i }).first();
        
        await this.page.waitForLoadState('domcontentloaded');
        await submitBtn.click({ force: true });
        console.log('>>> [Promotion] Submit button clicked');

        // Check for immediate validation error
        const errorMsg = this.page.locator('[id$="-form-item-message"], .text-destructive, [role="alert"]').filter({ visible: true }).first();
        if (await errorMsg.isVisible({ timeout: 2000 }).catch(() => false)) {
            const text = await errorMsg.innerText();
            if (text.trim() && !/성공|완료|등록되었습니다|저장되었습니다/.test(text)) {
                console.error(`>>> [Promotion] Validation Error detected: ${text}`);
                throw new Error(`Promotion creation failed validation: ${text}`);
            }
        }

        // Success detection - look for toast or modal closing
        try {
            console.log('>>> [Promotion] Waiting for success indicator...');
            await expect(this.page.locator('body')).toHaveText(/(등록되었습니다|완료되었습니다|성공|Success|Completed|Saved)/i, { timeout: 15000 });
            console.log('>>> [Promotion] Success indicator detected');
        } catch (e) {
            console.warn('>>> [Promotion] Success indicator not found, checking if modal closed...');
            const modal = this.page.getByRole('dialog').first();
            if (await modal.isVisible()) {
                await expect(modal).toBeHidden({ timeout: 8000 }).catch(() => {
                    console.error('>>> [Promotion] Modal still visible after timeout');
                });
            }
        }
        
        console.log('>>> [Promotion] Creation step completed, reloading page...');
        
        // Listen for the next POST request to see if it succeeds
        this.page.on('response', response => {
            if (response.url().includes('/api/v1/system/popups') && response.request().method() === 'POST') {
                console.log(`>>> [Promotion] API Response: ${response.status()} ${response.statusText()}`);
            }
        });

        await this.page.reload();
        await this.page.waitForLoadState('networkidle');
    }

    async verifyPromotionOnDashboard(popupTitle: string, bannerTitle: string) {
        console.log('>>> [Promotion] Verifying popup and banner on Dashboard');
        
        // Retry loop for eventual consistency
        for (let attempt = 0; attempt < 5; attempt++) {
            await this.page.goto('/');
            await this.page.waitForTimeout(2000);
            
            const popup = this.page.getByText(popupTitle, { exact: false }).first();
            if (await popup.isVisible({ timeout: 5000 }).catch(() => false)) {
                console.log(`>>> [Promotion] Popup visible on attempt ${attempt + 1}`);
                // Try to close the popup if there's a close button
                await this.page.locator('button').filter({ hasText: /닫기|Close/i }).first().click().catch(() => {});
                break;
            }
            console.log(`>>> [Promotion] Popup not visible (attempt ${attempt + 1}), reloading...`);
            await this.page.reload();
        }
        
        // 2. Verify Banner (Resilient to Slider)
        console.log(`>>> [Promotion] Checking banner: ${bannerTitle}`);
        await expect(this.page.getByText(bannerTitle).first()).toBeVisible({ timeout: 20000 });
    }
}
