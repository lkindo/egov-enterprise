import { Page, expect } from '@playwright/test';

export class OperationalExtensionPage {
    constructor(private page: Page) {}

    // Rewards Management
    async gotoRewards() {
        console.log('>>> Navigating to Rewards Management');
        await this.page.goto('/admin/operation/rewards');
        await expect(this.page.getByText('상훈 및 포상 관리 체계')).toBeVisible();
    }

    async searchRewards(keyword: string) {
        console.log(`>>> Searching rewards with keyword: ${keyword}`);
        const searchInput = this.page.getByPlaceholder('포상 명칭 또는 대상자 식별자로 분석...');
        await searchInput.fill(keyword);
        await this.page.getByRole('button', { name: 'ANALYZE' }).click();
        await this.page.waitForLoadState('networkidle');
    }

    // External HR Management
    async gotoExternalHr() {
        console.log('>>> Navigating to External HR Management');
        await this.page.goto('/admin/operation/external-hr');
        await expect(this.page.getByText('외부 인사 인벤토리')).toBeVisible();
    }

    async searchExternalHr(name: string) {
        console.log(`>>> Searching external HR with name: ${name}`);
        const searchInput = this.page.getByPlaceholder('인사 성명으로 검색...');
        await searchInput.fill(name);
        // StandardSearchFilter might have an icon or button to click
        await this.page.keyboard.press('Enter');
        await this.page.waitForLoadState('networkidle');
    }

    // Memo Reports
    async gotoMemoReports() {
        console.log('>>> Navigating to Memo Reports');
        await this.page.goto('/admin/operation/memo-reports');
        await expect(this.page.getByText('메모 보고 관리')).toBeVisible();
    }

    async switchReportTab(tab: string) {
        console.log(`>>> Switching to report tab: ${tab}`);
        await this.page.getByText(tab, { exact: true }).click();
        await this.page.waitForLoadState('networkidle');
        await this.page.waitForTimeout(1000); // Buffer for React state sync
    }

    // Rough Map
    async gotoRoughMap() {
        console.log('>>> Navigating to Rough Map Management');
        await this.page.goto('/admin/operation/rough-map');
        await expect(this.page.getByText('약도 및 거점 관리')).toBeVisible();
    }

    // SMS Service
    async gotoSms() {
        console.log('>>> Navigating to SMS Service');
        await this.page.goto('/cop/sms/selectSmsList');
        await expect(this.page.getByText('커뮤니케이션 매트릭스')).toBeVisible();
    }

    async sendSms(phone: string, content: string) {
        console.log(`>>> Sending SMS to ${phone}`);
        await this.page.getByRole('button', { name: '신규 문자 발송' }).click();
        await this.page.getByPlaceholder('010-0000-0000').fill(phone);
        await this.page.getByPlaceholder('전달할 메시지 내용을 입력하세요...').fill(content);
        await this.page.getByRole('button', { name: 'EXECUTE_TRANSMISSION' }).click();
        await expect(this.page.getByText('SMS가 성공적으로 전송되었습니다.')).toBeVisible();
    }
}
