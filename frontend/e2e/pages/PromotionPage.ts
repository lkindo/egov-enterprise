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
        this.modalSubmitButton = page.locator('button').filter({ hasText: /운영.*배포/ });
    }

    async gotoPromotion() {
        await this.page.goto('/admin/system/banner');
        await expect(this.page.getByText('배너/팝업 관리')).toBeVisible();
    }

    async createPopup(title: string) {
        await this.tabPopup.click({ force: true });
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
        const imagePath = 'e2e/test-assets/dummy_promotion.png';
        await this.page.setInputFiles('input[type="file"]', imagePath);
        
        console.log('>>> Submitting Popup Configuration');
        await this.modalSubmitButton.click();
        
        // Wait for modal to close and list to update (App calls refetch internally)
        await expect(this.page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 20000 });
        
        // Ensure the popup tab is active to see the new entry
        // Use force click because of potential backdrop/toast overlays
        await this.tabPopup.click({ force: true });
        
        const row = this.page.locator('tr').filter({ hasText: title }).first();
        await expect(row).toBeVisible({ timeout: 15000 });
    }

    async createBanner(title: string) {
        await this.tabBanner.click({ force: true });
        await this.page.getByRole('button', { name: /신규.*배너.*등록|신규.*등록/ }).click();
        
        await this.page.getByLabel(/배너 타이틀|배너명/).fill(title);
        await this.page.getByLabel(/링크.*URL|Link/).fill('https://egov.kr');
        await this.page.getByLabel(/배너 설명/).fill('E2E Generated Banner');
        
        console.log('>>> Uploading banner image');
        const imagePath = 'e2e/test-assets/dummy_promotion.png';
        await this.page.setInputFiles('input[type="file"]', imagePath);
        
        await this.page.getByLabel(/정렬.*순서|Order/).fill('1');
        
        console.log('>>> Submitting Banner Configuration');
        await this.modalSubmitButton.click();
        
        await expect(this.page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 20000 });
        const row = this.page.locator('tr').filter({ hasText: title }).first();
        await expect(row).toBeVisible({ timeout: 15000 });
    }
}
