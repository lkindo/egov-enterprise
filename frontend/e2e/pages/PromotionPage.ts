import { Page, Locator, expect } from '@playwright/test';
import { format } from 'date-fns';

export class PromotionPage {
    readonly page: Page;
    readonly tabBanner: Locator;
    readonly tabPopup: Locator;
    readonly modalSubmitButton: Locator;

    constructor(page: Page) {
        this.page = page;
        this.tabBanner = page.getByRole('button', { name: '배너 설정' });
        this.tabPopup = page.getByRole('button', { name: '팝업 설정' });
        this.modalSubmitButton = page.locator('button').filter({ hasText: /운영.*배포/ });
    }

    async gotoPromotion() {
        await this.page.goto('/admin/system/banner');
        await expect(this.page.getByText('배너/팝업 관리')).toBeVisible();
    }

    async createPopup(title: string) {
        console.log(`>>> Configuring popup: ${title}`);
        await this.tabPopup.waitFor({ state: 'visible' });
        await this.tabPopup.click({ force: true });
        
        // Wait for the specific "Create" button for popups
        const createBtn = this.page.getByRole('button', { name: /신규.*팝업.*등록|신규.*등록/ });
        await createBtn.waitFor({ state: 'visible' });
        await createBtn.click();
        
        await this.page.getByLabel(/팝업 타이틀/).fill(title);
        
        // Calculate dates: type="date" native HTML input → use fill() with YYYY-MM-DD format
        const now = new Date();
        const startDate = new Date(now);
        startDate.setDate(now.getDate() + 1);
        const endDate = new Date(now);
        endDate.setDate(now.getDate() + 7);
        
        const startStr = format(startDate, 'yyyy-MM-dd');
        const endStr = format(endDate, 'yyyy-MM-dd');
        
        console.log(`>>> Setting Start Date: ${startStr}`);
        // Native HTML date input requires special handling in Playwright
        // Use fill() which works for type="date" in Chromium
        const startInput = this.page.getByLabel(/게시 시작 시점/);
        await startInput.fill(startStr);
        
        console.log(`>>> Setting End Date: ${endStr}`);
        const endInput = this.page.getByLabel(/게시 종료 시점/);
        await endInput.fill(endStr);

        
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
        await expect(this.modalSubmitButton).toBeVisible();
        await this.modalSubmitButton.click();
        console.log('>>> Popup deployment initiated');
        
        // Wait for success toast or modal closure
        await Promise.race([
            expect(this.page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 15000 }),
            this.page.waitForSelector('text=/등록되었습니다|수정되었습니다|성공/', { timeout: 15000 })
        ]);
        console.log('>>> Popup creation process finished');
        
        // Wait for list to update
        await this.page.waitForTimeout(1000);
        
        // Ensure the popup tab is active to see the new entry
        await this.tabPopup.click({ force: true });
        
        const row = this.page.locator('tr').filter({ hasText: title }).first();
        await expect(row).toBeVisible({ timeout: 15000 });
    }

    async createBanner(title: string) {
        await this.tabBanner.click({ force: true });
        await this.page.getByRole('button', { name: /신규.*배너.*등록|신규.*등록/ }).click();
        
        await this.page.getByLabel(/배너 타이틀|배너명|이름/).fill(title);
        await this.page.getByLabel(/랜딩.*페이지|Target.*URL|URL/).fill('https://egov.kr');
        await this.page.getByLabel(/배너 설명/).fill('E2E Generated Banner');
        
        console.log('>>> Uploading banner image');
        const imagePath = 'e2e/test-assets/dummy_promotion.png';
        await this.page.setInputFiles('input[type="file"]', imagePath);
        
        await this.page.getByLabel(/정렬.*순서|Order/).fill('1');
        
        console.log('>>> Submitting Banner Configuration');
        await this.modalSubmitButton.click();
        
        await expect(this.page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 20000 });
        
        await this.page.waitForTimeout(1000);
        
        const row = this.page.locator('tr').filter({ hasText: title }).first();
        await expect(row).toBeVisible({ timeout: 15000 });
    }
}
