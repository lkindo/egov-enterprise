import { Page, Locator, expect } from '@playwright/test';

export class PromotionPage {
    readonly page: Page;
    readonly tabBanner: Locator;
    readonly tabPopup: Locator;
    readonly modal: Locator;

    constructor(page: Page) {
        this.page = page;
        this.tabBanner = page.getByRole('button', { name: '배너 설정' });
        this.tabPopup = page.getByRole('button', { name: '팝업 설정' });
        this.modal = page.getByRole('dialog');
        
        // Handle unexpected alerts
        this.page.on('dialog', async dialog => {
            console.log(`>>> [Promotion] Dialog detected: ${dialog.message()}`);
            await dialog.accept();
        });

        // Capture browser logs for debugging
        this.page.on('console', msg => {
            if (msg.type() === 'error' || msg.type() === 'warning') {
                console.log(`>>> [BROWSER ${msg.type().toUpperCase()}] ${msg.text()}`);
            }
        });

        this.page.on('response', async response => {
            if (response.status() >= 400) {
                console.log(`>>> [RESPONSE ERROR] ${response.status()} ${response.url()}`);
                try {
                    const body = await response.json();
                    console.log(`>>> [RESPONSE BODY] ${JSON.stringify(body, null, 2)}`);
                } catch (e) {
                    try {
                        const text = await response.text();
                        console.log(`>>> [RESPONSE TEXT] ${text.substring(0, 500)}`);
                    } catch (e2) {
                        console.log('>>> [RESPONSE BODY] Could not parse body');
                    }
                }
            }
        });
    }

    async gotoPromotion() {
        await this.page.goto('/admin/system/banner');
        await expect(this.page.getByText('배너/팝업 관리')).toBeVisible();
    }

    private async uploadDummyImage() {
        console.log(`>>> [Promotion] Uploading dummy image...`);
        const fileInput = this.modal.locator('input[type="file"]');
        if (await fileInput.count() > 0) {
            // Create a simple 1x1 pixel PNG buffer
            const buffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', 'base64');
            await fileInput.first().setInputFiles({
                name: 'dummy.png',
                mimeType: 'image/png',
                buffer: buffer
            });
            await this.page.waitForTimeout(1000); // Wait for upload state to update
        } else {
            console.warn(`>>> [Promotion] No file input found for upload.`);
        }
    }

    private async clickSubmitAndWait() {
        const submitBtn = this.modal.getByRole('button', { name: /운영.*배포|자산.*수정|등록|저장/ });
        await expect(submitBtn).toBeVisible({ timeout: 10000 });
        
        if (await submitBtn.isDisabled()) {
            console.log('>>> [Promotion] Submit button is disabled, waiting 2s...');
            await this.page.waitForTimeout(2000);
        }

        console.log('>>> [Promotion] Clicking submit button...');
        await submitBtn.click({ force: true });
        
        try {
            await Promise.race([
                this.modal.waitFor({ state: 'hidden', timeout: 15000 }),
                this.page.getByText(/등록되었습니다|수정되었습니다|성공|완료/).first().waitFor({ state: 'visible', timeout: 15000 })
            ]);
            console.log('>>> [Promotion] Modal closed or success toast detected');
        } catch (e) {
            console.error('>>> [Promotion] Modal still visible after 15s. Checking for validation errors...');
            
            const errorMessages = await this.modal.locator('.text-destructive, .text-red-500, [role="alert"]').allTextContents();
            if (errorMessages.length > 0) {
                console.error(`>>> [Promotion] Validation errors found: ${errorMessages.join(', ')}`);
            } else {
                console.error('>>> [Promotion] No explicit validation errors found, but modal is stuck.');
            }

            console.log('>>> [Promotion] Trying Escape and Refresh as fallback...');
            await this.page.keyboard.press('Escape');
            await this.page.waitForTimeout(1000);
            if (await this.modal.isVisible()) {
                await this.page.reload();
                await this.page.waitForTimeout(2000);
            }
        }
        await this.page.waitForTimeout(1000); 
    }

    async createPopup(title: string) {
        await this.ensureModalClosed();
        await this.tabPopup.click();
        await this.page.getByRole('button', { name: /신규.*팝업.*등록|신규.*등록/ }).click();
        await expect(this.modal).toBeVisible({ timeout: 10000 });
        
        // Fill Title
        const nameInput = this.modal.locator('input[name="popupTitleName"]');
        await nameInput.fill(title);

        // Fill Dates (type="date" uses yyyy-MM-dd)
        const today = new Date();
        const nextMonth = new Date();
        nextMonth.setMonth(today.getMonth() + 1);
        const formatDate = (d: Date) => d.toISOString().split('T')[0];

        const beginInput = this.modal.locator('input[name="noticeBeginDate"]');
        await beginInput.fill(formatDate(today));
        await beginInput.dispatchEvent('change');
        await beginInput.press('Tab');

        const endInput = this.modal.locator('input[name="noticeEndDate"]');
        await endInput.fill(formatDate(nextMonth));
        await endInput.dispatchEvent('change');
        await endInput.press('Tab');

        // Coordinates & Size (if not filled, Zod might complain)
        await this.modal.locator('input[name="popupWidthLocation"]').fill('100');
        await this.modal.locator('input[name="popupHeightLocation"]').fill('100');
        await this.modal.locator('input[name="popupWidthSize"]').fill('500');
        await this.modal.locator('input[name="popupHeightSize"]').fill('500');

        await this.uploadDummyImage();
        await this.clickSubmitAndWait();
    }

    async createBanner(title: string) {
        await this.ensureModalClosed();
        await this.tabBanner.click();
        await this.page.getByRole('button', { name: /신규.*배너.*등록|신규.*등록/ }).click();
        await expect(this.modal).toBeVisible({ timeout: 10000 });
        
        const nameInput = this.modal.locator('input[name="bannerNm"]');
        await nameInput.fill(title);

        await this.modal.locator('input[name="sortOrdr"]').fill('1');

        await this.uploadDummyImage();
        await this.clickSubmitAndWait();
    }

    private async ensureModalClosed() {
        if (await this.modal.isVisible()) {
            await this.page.keyboard.press('Escape');
            try {
                await this.modal.waitFor({ state: 'hidden', timeout: 3000 });
            } catch {
                console.log('>>> [Promotion] Modal still visible after Escape, refreshing page...');
                await this.page.reload();
                await this.page.waitForTimeout(2000);
            }
        }
    }
}

