import { Page, expect } from '@playwright/test';

export class OperationalExtensionPage {
    constructor(public page: Page) {}

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
        // [2026-08-04] 전환 잔상 대기 — MailPage.verifyMailInHistory 와 같은 원인이다.
        //   App Router 가 나가는 화면을 잠시 마운트한 채로 두어 같은 제목이 2개 잡혔다(CI 실측).
        //   하나로 수렴할 때까지 기다린다 — 수렴하지 않으면 실제 중복이므로 여전히 실패한다.
        await expect(this.page.getByText('외부 인사 인벤토리')).toHaveCount(1, { timeout: 10000 });
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
        // Suspense fallback의 sr-only 제목('…불러오는 중')과 부분 일치하지 않도록 실제 화면 제목을 고정한다.
        await expect(this.page.getByRole('heading', { name: '메모 보고 관리', exact: true })).toBeVisible();
    }

    async switchReportTab(tab: string) {
        console.log(`>>> Switching to report tab: ${tab}`);
        const tabControl = this.page.getByRole('tab', { name: tab, exact: true });
        await tabControl.click();
        await expect(tabControl).toHaveAttribute('aria-selected', 'true');
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
        // /cop/sms/selectSmsList -> (next.config redirect) -> /admin/uss/ion/sms (SmsAdminClient)
        await this.page.goto('/cop/sms/selectSmsList');
        await expect(this.page.getByRole('heading', { name: '메시지 오케스트레이션' })).toBeVisible();
    }

    async sendSms(phone: string, content: string) {
        console.log(`>>> Sending SMS to ${phone}`);
        await this.page.getByRole('button', { name: '새 메시지 구성' }).click();
        await this.page.getByPlaceholder('010-0000-0000').fill(phone);
        await this.page.getByPlaceholder('메시지 내용을 입력하세요...').fill(content);
        await this.page.getByRole('button', { name: 'Execute Send' }).click();
        await expect(this.page.getByText('문자 메시지를 발송했습니다.')).toBeVisible();
    }
}
