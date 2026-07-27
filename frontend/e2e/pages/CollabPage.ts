import { Page, expect, Locator } from '@playwright/test';

export class CollabPage {
    readonly reloadBtn: Locator;

    constructor(private page: Page) {
        this.reloadBtn = this.page.getByRole('button', { name: /RELOAD/i });
    }

    async goto() {
        console.log('>>> [Collab] Navigating to Collaboration Hub');
        await this.page.goto('/admin/collaboration');
        await expect(this.page.getByRole('heading', { name: /협업 및 네트워크 허브/i })).toBeVisible({ timeout: 60000 });
    }

    /**
     * [2026-07-27 정정] 종전 시그니처는 'MESSAGES' | 'CONTACTS' | 'CALENDAR' | 'SCRAPS' 였고
     * 그 영문 문자열을 **탭 이름 그대로** getByRole('button') 으로 찾았다. 실제 UI 와 두 겹으로 어긋난다:
     *   ① CollaborationHubClient 의 탭은 COLLABORATION_TABS = MESSAGES | ADDRESS_BOOK | SCRAPS 이고
     *      화면에 찍히는 라벨은 TAB_LABEL 의 한글(쪽지 / 주소록 / 스크랩)이다. 'CONTACTS' 와 'CALENDAR' 는
     *      저장소 어디에도 없는 팬텀이었다(CALENDAR 탭은 존재조차 하지 않는다).
     *   ② 탭은 <Button role="tab"> 이라 **명시적 role 이 암시적 button 역할을 덮어쓴다** — getByRole('button')
     *      으로는 원리적으로 잡히지 않는다. 그래서 5분 타임아웃까지 그냥 기다렸다.
     */
    async switchTab(tab: 'MESSAGES' | 'ADDRESS_BOOK' | 'SCRAPS') {
        console.log(`>>> [Collab] Switching to tab: ${tab}`);
        const label = tab === 'MESSAGES' ? '쪽지' : tab === 'ADDRESS_BOOK' ? '주소록' : '스크랩';
        // 페이지 전환 중 동일 탭이 일시적으로 2개 존재(strict-mode 위반) → exact + first로 방어
        await this.page.getByRole('tab', { name: label, exact: true }).first().click();
        await this.page.waitForTimeout(1000);
    }

    /**
     * ⚠ [2026-07-27] 이 메서드는 **어떤 스펙에서도 호출되지 않는다**(호출부 0). 아래 셀렉터 중
     * `/신규 전송/i`(실제는 '신규 발송') · `/Target Locked/i`(실제는 selected-recipient-badge / 'N명 선택됨')
     * · `/성공적으로 발송되었습니다/i`(실제는 '메일이 발송 요청되었습니다.') 는 저장소에 존재하지 않는
     * 팬텀이다. 실행 경로가 없어 검증할 수 없으므로 추측으로 고쳐 두지 않고 사실만 남긴다 —
     * 되살릴 때 위 실측 문구로 교체하고 실제로 돌려서 확인할 것.
     */
    async sendNote(recipient: string = 'webmaster', subject: string, content: string) {
        console.log(`>>> [Collab] Sending Note to: ${recipient}`);
        await this.switchTab('MESSAGES');
        
        // The button text is "신규 전송" (with Plus icon)
        await this.page.getByRole('button', { name: /신규 전송/i }).click();
        await expect(this.page).toHaveURL(/\/admin\/collaboration\/mail-send/, { timeout: 60000 });
        
        const searchInput = this.page.getByTestId('mail-recipient-input');
        await expect(searchInput).toBeVisible({ timeout: 60000 });
        await searchInput.click();
        await this.page.waitForTimeout(500);
        
        console.log(`>>> [Collab] Searching for recipient: ${recipient}`);
        await this.page.keyboard.press('Control+A');
        await this.page.keyboard.press('Backspace');
        await searchInput.pressSequentially(recipient, { delay: 150 });
        
        const recipientItem = this.page.getByTestId('recipient-item').first();
        await expect(recipientItem).toBeVisible({ timeout: 60000 });
        await recipientItem.click();
        
        await expect(this.page.getByText(/Target Locked/i)).toBeVisible({ timeout: 60000 });
        
        const subjectInput = this.page.getByTestId('mail-subject-input');
        await subjectInput.click();
        await subjectInput.pressSequentially(subject, { delay: 30 });
        
        const contentInput = this.page.getByTestId('mail-content-textarea');
        await contentInput.click();
        await contentInput.pressSequentially(content, { delay: 30 });
        
        const sendBtn = this.page.getByTestId('mail-send-btn');
        await expect(sendBtn).toBeVisible();
        await sendBtn.click();
        
        await expect(this.page.getByText(/성공적으로 발송되었습니다/i)).toBeVisible({ timeout: 60000 });
        
        await expect(this.page).toHaveURL(/\/admin\/collaboration\/mail-history/);
    }

    async createContact(name: string, email: string, tel: string = '01000000000') {
        console.log(`>>> [Collab] Creating Contact: ${name}`);
        await this.switchTab('ADDRESS_BOOK');

        // 종전 /신규 연락처/i 는 실존하지 않는 문구. 실측 headerAction 라벨은 '주소록 등록'.
        await this.page.getByRole('button', { name: /주소록 등록/i }).first().click();
        await expect(this.page).toHaveURL(/\/admin\/collaboration\/address-book\/insert-address-book/);
        
        // soft-nav 전환 중 이전/이후 라우트 DOM이 잠깐 공존해 testid가 2개로 잡히므로 first()로 방어
        const nameInput = this.page.getByTestId('identity-name-input').first();
        const emailInput = this.page.getByTestId('identity-email-input').first();
        const telInput = this.page.getByTestId('identity-tel-input').first();
        await expect(nameInput).toBeVisible();
        await this.page.waitForTimeout(1000);
        
        await nameInput.click();
        await nameInput.fill(name);
        
        await emailInput.click();
        await emailInput.fill(email);
        
        await telInput.click();
        await telInput.fill(tel);
        
        await this.page.getByTestId('commit-identity-button').click();
        await expect(this.page.getByText(/주소록이 등록되었습니다/i)).toBeVisible({ timeout: 60000 });
    }

    async verifyIdentityInList(name: string) {
        console.log(`>>> [Collab] Verifying visibility in Network Index: ${name}`);
        // 등록 직후에는 주소록 목록 라우트에 있어 허브 탭이 없다. 정규 인덱스(허브)로 명시 이동한 뒤 검증한다.
        await this.page.goto('/admin/collaboration?tab=ADDRESS_BOOK');
        await expect(this.page.getByRole('heading', { name: /협업 및 네트워크 허브/i })).toBeVisible({ timeout: 60000 });
        await this.switchTab('ADDRESS_BOOK');

        // 허브 검색창 placeholder 는 `${TAB_LABEL[activeTab]} 검색어를 입력하세요.` 다.
        // 종전 /검색어를 입력하십시오/i 는 WorkHubClient 의 문구이며 이 화면에는 없다.
        const searchInput = this.page.getByPlaceholder(/검색어를 입력하세요/i);
        await expect(searchInput).toBeVisible();
        
        await searchInput.click();
        await searchInput.fill('');
        await searchInput.pressSequentially(name, { delay: 100 });
        await this.page.keyboard.press('Enter');
        
        await this.page.waitForTimeout(2000);
        await expect(this.page.getByText(name).first()).toBeVisible({ timeout: 60000 });
    }

    async deleteNote(subject?: string) {
        console.log('>>> [Collab] Deleting note from history...');
        
        let found = false;
        for (let i = 0; i < 3; i++) {
            if (!this.page.url().includes('mail-history')) {
                await this.page.goto('/admin/collaboration/mail-history');
            } else if (i > 0) {
                await this.page.reload();
            }
            await this.page.waitForLoadState('networkidle');
            
            if (subject) {
                console.log(`>>> [Collab] Searching for mail with subject: ${subject} (Attempt ${i+1})`);
                const searchInput = this.page.getByPlaceholder(/메일 제목 또는 수신자 검색/i);
                await searchInput.click();
                await searchInput.fill(subject);
                // Wait for potential debounce and network request
                await this.page.waitForTimeout(2000);
            }

            // Target only the data rows, avoiding the header
            const mailRows = this.page.locator('tbody tr');
            const targetRow = subject 
                ? mailRows.filter({ hasText: subject }).first() 
                : mailRows.first();
            
            if (await targetRow.isVisible()) {
                console.log('>>> [Collab] Target row found in history');
                found = true;
                break;
            }
            console.log(`>>> [Collab] Target row not found, retrying... (${i+1}/3)`);
            await this.page.waitForTimeout(2000);
        }

        if (!found) {
            throw new Error(`[Collab] CRITICAL: No mail items found with subject "${subject}" after retries.`);
        }

        // Re-identify the target row outside the loop
        const mailRows = this.page.locator('tbody tr');
        const targetItem = subject ? mailRows.filter({ hasText: subject }).first() : mailRows.first();

        // The delete button is inside the row in the Bento Grid version
        const deleteBtn = targetItem.getByTestId('delete-mail-btn');
        await expect(deleteBtn).toBeVisible({ timeout: 60000 });
        
        this.page.once('dialog', async dialog => {
            console.log(`>>> [Collab] Dialog detected: ${dialog.message()}`);
            await dialog.accept();
        });

        await deleteBtn.click();
        
        await expect(this.page.getByText(/성공적으로 삭제되었습니다/i).first()).toBeVisible({ timeout: 60000 });
        await this.page.waitForLoadState('networkidle');
        console.log('>>> [Collab] Mail record purged successfully');
    }

    async verifyStatsDashboard() {
        console.log('>>> [Collab] Navigating to Intelligence Stats Dashboard');
        await this.page.goto('/admin/stats');
        await expect(this.page.getByRole('heading', { name: /인텔리전스 시스템 아키텍처 분석/i })).toBeVisible();
        
        console.log('>>> [Collab] Verifying chart components are rendered');
        await this.page.waitForSelector('canvas, svg, .recharts-surface', { timeout: 60000 });
        
        console.log('>>> [Collab] Changing period to: MONTHLY_BATCH (30D)');
        await this.page.getByLabel(/통계 조회 기간 선택/i).selectOption('MONTHLY_BATCH (30D)');
        
        console.log('>>> [Collab] Verifying Excel Export capability');
        await expect(this.page.getByRole('button', { name: /엑셀 내보내기/i })).toBeVisible();
    }
}
