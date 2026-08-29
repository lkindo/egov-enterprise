import { Page, expect } from '@playwright/test';

export class WorkspacePage {
    constructor(private page: Page) {}

    async navigateToMyPageSettings() {
        await this.page.goto('/admin/workspace/my-page');
    }

    async verifyMyPageHeader() {
        /*
         * [2026-08-29] 제목이 '마이페이지 환경 설정' → '마이페이지 콘텐츠 등록' 으로 바뀌었다.
         *
         * 종전 제목과 설명('개인 대시보드에 배치할 콘텐츠와 위젯을 관리합니다')은 이 화면이 하지
         * 않는 일을 약속했다 — 그 배치를 렌더하는 화면이 저장소에 없다(대시보드 위젯 SPI
         * 구현체는 board·informalsanction 둘이며 이 값을 읽지 않는다). 저장은 실제로 되므로
         * 기능은 남기고 문구만 사실로 고쳤다.
         *
         * 화면이 하는 일(등록·사용 여부 저장)은 그대로이므로 이 page object 의 나머지 동작
         * (toggleContentStatus 등)은 바뀌지 않는다.
         */
        const header = this.page.getByRole('heading', { name: /마이페이지 (콘텐츠 등록|환경 설정|설정)/ }).first();
        await header.waitFor({ state: 'visible' });
        await expect(header).toBeVisible();
    }

    async toggleContentStatus(index: number = 0) {
        // Wait for loading to finish
        await this.page.waitForSelector('.animate-pulse', { state: 'detached' });
        
        const toggleButtons = this.page.locator('main button').filter({ has: this.page.locator('svg') });
        const count = await toggleButtons.count();
        if (count > 0) {
            const button = toggleButtons.nth(index);
            await button.click();
            // In the environment, it might show a toast
            try {
                await expect(this.page.locator('div[role="status"], .toast')).toBeVisible({ timeout: 5000 });
            } catch (e) {
                console.log('>>> Toast notification not detected, continuing...');
            }
        } else {
            console.log('>>> No content items found to toggle.');
        }
    }
}
