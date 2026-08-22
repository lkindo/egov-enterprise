import { Page, expect } from '@playwright/test';

export class MailPage {
    constructor(private page: Page) {}

    async navigateToSend() {
        console.log('[E2E] Navigating to Mail Send page...');
        await this.page.goto('/admin/collaboration/mail-send', { waitUntil: 'load' });
    }

    async navigateToHistory() {
        console.log('[E2E] Navigating to Mail History page...');
        await this.page.goto('/admin/collaboration/mail-history', { waitUntil: 'load' });
    }

    async sendMail(recipients: string, subject: string, content: string) {
        // Search and select recipient(s)
        const recipientList = recipients.split(/[,;]/).map(r => r.trim());
        const recipientInput = this.page.getByTestId('mail-recipient-input');

        for (const recipient of recipientList) {
            await recipientInput.click();
            await recipientInput.clear();
            await recipientInput.fill(recipient);

            const addRecipientButton = this.page.getByTestId('mail-recipient-add-btn');
            await expect(addRecipientButton).toBeEnabled();
            await addRecipientButton.click();

            const selectedRecipient = this.page
                .getByTestId('selected-recipient-badge')
                .filter({ hasText: recipient });
            await expect(selectedRecipient).toBeVisible();
            console.log(`>>> Selected recipient for: ${recipient}`);
        }

        // Fill form
        await this.page.getByTestId('mail-subject-input').fill(subject);
        await this.page.getByTestId('mail-content-textarea').fill(content);

        // Submit
        const sendBtn = this.page.getByTestId('mail-send-btn');
        await expect(sendBtn).toBeEnabled({ timeout: 10000 });
        await sendBtn.click({ force: true });
        
        // Should redirect to history
        await this.page.waitForURL(/\/mail-history/, { timeout: 15000 });
        await this.page.locator('[data-testid="mail-item"]').first().waitFor({ state: 'visible', timeout: 15000 });
    }

    async verifyMailInHistory(subject: string) {
        console.log(`[E2E] Verifying mail in history: ${subject}`);
        await expect(this.page).toHaveURL(/\/mail-history/);
        
        // 1. Force search to isolate the item (prevents clicking wrong item or race conditions)
        const searchInput = this.page.getByRole('textbox', { name: '메일 검색' });

        // [2026-08-04] 라우트 전환 잔상 대기 — App Router 는 클라이언트 내비게이션 중 나가는 화면을
        //   잠시 마운트한 채로 둔다. 그 순간 같은 컴포넌트가 2개 잡혀 strict mode violation 이 났다
        //   (CI 실측: 동일한 aria-label·placeholder·클래스의 input 2개. 설계상 검색창은 하나뿐이다).
        //   `.first()` 로 덮지 않는 이유는 그것이 **진짜 중복 UI 도 통과**시키기 때문이다.
        //   여기서는 '하나로 수렴할 때까지' 기다린다 — 수렴하지 않으면(=실제 중복) 여전히 실패한다.
        await expect(searchInput).toHaveCount(1, { timeout: 10000 });
        const mailItem = this.page.getByTestId('mail-item').filter({ hasText: subject }).first();
        
        // Retry loop for eventual consistency (DB sync delay)
        let found = false;
        for (let i = 0; i < 3; i++) {
            console.log(`>>> [Mail] Searching for subject: ${subject} (attempt ${i + 1})`);
            await searchInput.clear();
            await searchInput.fill(subject);
            await this.page.keyboard.press('Enter');
            
            const mailVisible = await mailItem
                .waitFor({ state: 'visible', timeout: 5000 })
                .then(() => true)
                .catch(() => false);
            if (mailVisible) {
                found = true;
                break;
            }
            console.log(`>>> [Mail] Subject not found in attempt ${i + 1}, retrying...`);
            await this.page.reload();
            await this.page.waitForLoadState('networkidle');
        }

        if (!found) {
            console.error(`>>> [Mail] Failed to find mail with subject: ${subject} after retries.`);
        }
        await mailItem.waitFor({ state: 'visible', timeout: 15000 });

        // StandardDataTable 행은 더 이상 자체 클릭 계약을 갖지 않는다. 호출부가 제공한
        // 실제 intent의 접근 가능한 작업 버튼으로 상세를 연다.
        console.log('[E2E] Opening mail history detail...');
        const openDetailButton = mailItem.getByRole('button', {
            name: `${subject} 발신 이력 상세 열기`,
            exact: true,
        });
        await expect(openDetailButton).toBeVisible({ timeout: 10000 });
        await openDetailButton.click();

        // 레이아웃용 Tailwind 클래스가 아니라 화면이 공개하는 헤딩 계약으로 상세 마운트를 확인한다.
        await expect(this.page.getByRole('heading', { name: '발신 상세', exact: true }))
            .toBeVisible({ timeout: 15000 });
        await expect(this.page.getByRole('heading', { name: subject, exact: true }))
            .toBeVisible({ timeout: 20000 });
        
        console.log(`[E2E] Success: Mail "${subject}" verified in detail panel.`);
    }

    async deleteMail(subject: string) {
        console.log(`[E2E] Deleting mail: ${subject}`);
        
        const searchInput = this.page.getByRole('textbox', { name: '메일 검색' });
        await searchInput.clear();
        await searchInput.fill(subject);
        await this.page.keyboard.press('Enter');

        const mailItem = this.page.getByTestId('mail-item').filter({ hasText: subject }).first();
        await mailItem.waitFor({ state: 'visible', timeout: 10000 });
        const openDetailButton = mailItem.getByRole('button', {
            name: `${subject} 발신 이력 상세 열기`,
            exact: true,
        });
        await expect(openDetailButton).toBeVisible({ timeout: 10000 });
        await openDetailButton.click();
        await expect(this.page.getByRole('heading', { name: '발신 상세', exact: true }))
            .toBeVisible({ timeout: 10000 });

        // [2026-08-22 정정] 상세 패널 삭제 버튼의 testid 를 목록 행 액션과 분리했다
        //   (MailHistoryHubClient.tsx:340 `mail-detail-delete-btn`). 종전에는 둘이 같은
        //   `delete-mail-btn` 이라 strict mode violation 이 났고, StandardDataTable 의
        //   테이블·카드 이중 렌더까지 겹쳐 요소가 3개→7개로 늘었다.
        //   스코프 대신 **식별자 분리**로 해결했으므로 여기서는 page 범위 조회로 정확히 1개다.
        const deleteBtn = this.page.getByTestId('mail-detail-delete-btn');
        await deleteBtn.waitFor({ state: 'visible', timeout: 5000 });
        await deleteBtn.click();

        // [2026-07-27 정정] 종전엔 page.once('dialog') 로 네이티브 window.confirm 을 수락하려 했다.
        // 그러나 MailHistoryHubClient 는 커스텀 확인 다이얼로그(useConfirm, confirmText '삭제')를 쓴다 —
        // 핸들러가 한 번도 불리지 않는 死코드였고 확인 버튼을 아무도 누르지 않았다.
        const confirmBtn = this.page.getByRole('dialog').getByRole('button', { name: '삭제', exact: true });
        await expect(confirmBtn).toBeVisible({ timeout: 10000 });
        await confirmBtn.click();
        
        await expect(mailItem).not.toBeVisible({ timeout: 15000 });
        console.log('[E2E] Mail deleted successfully.');
    }
}
