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
        // [2026-08-24 A1 이행] 조회 조건이 표 내부에서 WorkListPage 조회 조건 영역으로 올라갔고
        //   영문 'ANALYZE' 버튼이 '조회' 로 바뀌었다(카탈로그 G2·G14).
        //   두 문구는 rewards-e2e-contract 단위 계약이 함께 고정한다.
        const searchInput = this.page.getByPlaceholder('포상 명칭 또는 대상자로 검색');
        await searchInput.fill(keyword);
        await this.page.getByRole('button', { name: '조회' }).click();
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
        // [2026-08-24 A1 이행] 조회 조건이 WorkListPage 조회 조건 영역으로 올라가면서
        //   placeholder 의 말줄임표가 사라졌다(카탈로그 G2). Enter 제출 계약은 그대로다.
        const searchInput = this.page.getByPlaceholder('인사 성명으로 검색');
        await searchInput.fill(name);
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
        // [2026-08-24 A1 이행] 마케팅 제목('메시지 오케스트레이션')을 업무 제목으로 바꿨다(G14).
        await expect(this.page.getByRole('heading', { name: '문자 메시지 발송 관리', exact: true })).toBeVisible();
    }

    async sendSms(phone: string, content: string) {
        console.log(`>>> Sending SMS to ${phone}`);
        await this.page.getByRole('button', { name: '새 메시지 구성' }).click();
        await this.page.getByPlaceholder('010-0000-0000').fill(phone);
        await this.page.getByPlaceholder('메시지 내용을 입력하세요...').fill(content);
        // [2026-08-24 A1 이행] 영문 버튼 'Execute Send' → '발송'(G14).
        await this.page.getByRole('button', { name: '발송', exact: true }).click();
        // [2026-08-28] 종전 문구 '문자 메시지를 발송했습니다.' 는 사실이 아니었다 —
        //   응답은 접수일 뿐이고 전송 구현체는 두 프로필 모두 항상 실패를 반환한다.
        await expect(this.page.getByText('발송 요청을 접수했습니다', { exact: false })).toBeVisible();
    }
}
