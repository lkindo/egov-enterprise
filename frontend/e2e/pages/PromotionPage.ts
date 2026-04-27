import { Page, Locator, expect } from '@playwright/test';

export class PromotionPage {
    readonly page: Page;
    readonly tabBanner: Locator;
    readonly tabPopup: Locator;
    readonly createButton: Locator;
    readonly modalSubmitButton: Locator;

    constructor(page: Page) {
        this.page = page;
        this.tabBanner = page.getByRole('button', { name: '배너 설정' });
        this.tabPopup = page.getByRole('button', { name: '팝업 설정' });
        this.createButton = page.getByRole('button', { name: /신규 .* 등록/ });
        this.modalSubmitButton = page.getByRole('button', { name: '운영 배포' });
    }

    async gotoPromotion() {
        await this.page.goto('/admin/system/banner');
        await expect(this.page.getByText('배너/팝업 관리')).toBeVisible();
    }

    async createPopup(title: string) {
        await this.tabPopup.click();
        // Label changes dynamically: '신규 배너 등록' -> '신규 팝업 등록'
        await this.page.getByRole('button', { name: /신규.*팝업.*등록|신규.*등록/ }).click();
        
        await this.page.getByLabel(/팝업 타이틀/).fill(title);
        
        // Fill dates (Today to next week)
        const today = new Date().toISOString().split('T')[0];
        const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        // Use more specific locators for date inputs
        const dateInputs = this.page.locator('input[type="date"]');
        await dateInputs.nth(0).fill(today);
        await dateInputs.nth(1).fill(nextWeek);
        
        // Coordinates (Mandatory)
        await this.page.getByLabel(/가로 좌표/).fill('0');
        await this.page.getByLabel(/세로 좌표/).fill('0');
        
        // Dimensions
        await this.page.getByLabel(/가로 폭/).fill('500');
        await this.page.getByLabel(/세로 높이/).fill('500');
        
        // Upload mandatory image
        console.log('>>> Uploading popup image');
        const imagePath = 'C:\\Users\\lkind\\.gemini\\antigravity\\brain\\54c107f2-d48e-48b2-acab-8177e07271b3\\dummy_popup_image_1777279350334.png';
        await this.page.setInputFiles('input[type="file"]', imagePath);
        
        console.log('>>> Submitting Popup Configuration');
        await this.modalSubmitButton.click();
        
        // Wait for modal to close and list to update (App calls refetch internally)
        await expect(this.page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 20000 });
        
        console.log('>>> Verifying popup in list');
        // Use row filtering for better accuracy
        const row = this.page.locator('tr').filter({ hasText: title }).first();
        await expect(row).toBeVisible({ timeout: 15000 });
    }
}
