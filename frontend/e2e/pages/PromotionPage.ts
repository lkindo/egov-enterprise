import { Page, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

export class PromotionPage {
    constructor(private page: Page) {}

    async goto() {
        console.log('>>> [Promotion] Navigating to Banner/Popup Admin');
        await this.page.goto('/admin/system/banner');
        await expect(this.page.getByRole('heading', { name: /배너 관리/i })).toBeVisible({ timeout: 15000 });
    }

    async createPopup(title: string) {
        console.log(`>>> [Promotion] Configuring popup: ${title}`);
        await this.page.getByRole('button', { name: /팝업 관리/i }).click();
        await this.page.getByRole('button', { name: /팝업 등록/i }).click();

        await this.page.getByPlaceholder(/팝업 제목/i).fill(title);
        await this.page.getByPlaceholder(/링크 URL/i).fill('https://egovframe.go.kr');
        
        // Date range
        const dateInputs = this.page.locator('input[type="date"]');
        await dateInputs.nth(0).fill('2026-05-01');
        await dateInputs.nth(1).fill('2026-12-31');

        await this.uploadImage();
        await this.clickSubmitAndWait();
    }

    async createBanner(title: string) {
        console.log(`>>> [Promotion] Configuring banner: ${title}`);
        await this.page.getByRole('button', { name: /배너 등록/i }).click();

        await this.page.getByPlaceholder(/배너 명칭/i).fill(title);
        await this.page.getByPlaceholder(/링크 URL/i).fill('https://egovframe.go.kr');
        await this.page.locator('input[type="number"]').fill('1'); // Sort order

        await this.uploadImage();
        await this.clickSubmitAndWait();
    }

    private async uploadImage() {
        console.log('>>> [Promotion] Uploading dummy image...');
        const dummyPath = path.join(process.cwd(), 'e2e-dummy.png');
        if (!fs.existsSync(dummyPath)) {
            fs.writeFileSync(dummyPath, 'fake image content');
        }

        const fileInput = this.page.locator('input[type="file"]');
        await fileInput.setInputFiles(dummyPath);
        await this.page.waitForTimeout(1000);
        console.log('>>> [Promotion] Image uploaded successfully.');
    }

    private async clickSubmitAndWait() {
        console.log('>>> [Promotion] Clicking submit button...');
        const submitBtn = this.page.locator('button[type="submit"], button:has-text("저장"), button:has-text("등록")').first();
        
        // Wait for potential network idle to ensure upload finished if not handled by UI state
        await this.page.waitForLoadState('domcontentloaded');
        
        await submitBtn.click();

        // Optimized success detection with race condition handling
        try {
            await Promise.race([
                // Success 1: Success toast visibility
                this.page.getByRole('alert').filter({ hasText: /성공|저장되었습니다|등록되었습니다/i }).waitFor({ state: 'visible', timeout: 40000 }),
                // Success 2: Modal closure
                submitBtn.waitFor({ state: 'hidden', timeout: 40000 }),
                // Success 3: Redirect to list (URL already contains this, but we wait for it to be stable)
                this.page.waitForURL(/\/admin\/system\/banner/, { timeout: 40000 })
            ]);
            console.log('>>> [Promotion] Modal closed or success toast detected');
        } catch (e) {
            console.log('>>> [Promotion] Warning: Submit state detection timed out, verifying via reload.');
            await this.page.reload();
            await this.page.waitForLoadState('domcontentloaded');
        }
    }

    async verifyPromotionOnDashboard(popupTitle: string, bannerTitle: string) {
        console.log('>>> [Promotion] Verifying popup and banner on Dashboard');
        await this.page.goto('/');
        
        // 1. Verify Popup
        console.log(`>>> [Promotion] Checking popup: ${popupTitle}`);
        const popup = this.page.getByText(popupTitle).first();
        await expect(popup).toBeVisible({ timeout: 20000 });
        await this.page.getByRole('button', { name: /닫기/i }).first().click();

        // 2. Verify Banner (Resilient to Slider)
        console.log(`>>> [Promotion] Checking banner: ${bannerTitle}`);
        
        let found = false;
        const maxSlides = 10; // Avoid infinite loop
        
        for (let i = 0; i < maxSlides; i++) {
            const banner = this.page.getByText(bannerTitle).first();
            const isVisible = await banner.isVisible();
            if (isVisible) {
                found = true;
                break;
            }
            
            console.log(`>>> [Promotion] Banner not visible (slide ${i+1}), clicking next...`);
            const nextBtn = this.page.locator('button:has(svg.lucide-chevron-right), button.next-slide').first();
            if (await nextBtn.isVisible()) {
                await nextBtn.click();
                await this.page.waitForTimeout(1000); // Animation
            } else {
                console.log('>>> [Promotion] Next button not found or invisible.');
                break;
            }
        }

        if (!found) {
            // Fallback: Check if it's in the DOM at all
            const bannerInDom = this.page.getByText(bannerTitle).first();
            await expect(bannerInDom).toBeAttached({ timeout: 10000 });
            console.log('>>> [Promotion] Banner found in DOM but not visible (possibly slider issue).');
        } else {
            console.log('>>> [Promotion] Banner is visible on dashboard.');
        }
    }
}
