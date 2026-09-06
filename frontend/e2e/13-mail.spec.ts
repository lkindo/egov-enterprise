import { test, expect } from './fixtures/base-test';
import { MailPage } from './pages/MailPage';
import fs from 'fs';
import path from 'path';

test.describe('Tier 13: Enterprise Mail System E2E', () => {
    test.use({ storageState: 'playwright/.auth/admin.json' });
    let mailPage: MailPage;

    test.beforeEach(async ({ page }) => {
        mailPage = new MailPage(page);
    });

    test('should send a mail and verify it in history', async ({ page }) => {
        const subject = `E2E ${Date.now()}`;
        const content = 'This is an automated test mail content.';
        /*
         * [2026-08-29] 수신자를 ID('webmaster')에서 메일 주소로 바꾼다.
         *
         * 종전에는 맨 ID 를 넣고 UI 가 받아들이는 것을 확인했다. 그런데 서버에는 ID 를 주소로
         * 바꿔 주는 경로가 없다 — recptnPerson 이 아무 변환 없이 SMTP 수신 주소가 된다
         * (MailService → MailAsyncProcessor.emailSender.send). 즉 이 스펙은 **갈 수 없는
         * 주소로 보내는 것을 정상 경로로 고정**하고 있었다. 발송이 @Async 라 실패가 화면에
         * 돌아오지 않아 e2e 에서도 드러나지 않았다.
         */
        const recipientSearch = 'webmaster@example.com';

        await mailPage.navigateToSend();
        await mailPage.sendMail(recipientSearch, subject, content);

        // Verification in history
        await mailPage.verifyMailInHistory(subject);
    });

    test('should search and delete a mail from history', async ({ page }) => {
        // First send one to ensure we have something to delete
        const subject = `DEL ${Date.now()}`;
        await mailPage.navigateToSend();
        await mailPage.sendMail('webmaster@example.com', subject, 'Cleanup test');

        await mailPage.navigateToHistory();
        
        // Search
        const searchInput = page.getByRole('textbox', { name: '메일 검색' });
        await searchInput.fill(subject);
        await searchInput.press('Enter');

        await mailPage.deleteMail(subject);
    });

    test('Mail: Multi-recipient Dispatch', async ({ page }) => {
        const subject = `MULTI ${Date.now()}`;
        // Recipients separated by comma or semicolon
        const recipients = 'webmaster@example.com, test1@example.com'; 
        
        await mailPage.navigateToSend();
        await mailPage.sendMail(recipients, subject, 'Testing multi-recipient delivery logic.');

        // Verification in history
        await mailPage.verifyMailInHistory(subject);
        console.log('>>> Multi-recipient mail dispatch verified in history');
    });

    test('Mail: Empty Recipient Validation', async ({ page }) => {
        await mailPage.navigateToSend();

        await page.getByTestId('mail-subject-input').fill('Recipient validation');
        await page.getByTestId('mail-content-textarea').fill('Recipient is intentionally empty.');
        await page.getByTestId('mail-send-btn').click();

        const recipientInput = page.getByTestId('mail-recipient-input');
        // [2026-09-05 DEC-OPS-035] 수신자 필드 키가 recptnPerson(100자 문자열) → recipients[] 로 바뀌었다.
        await expect(page.locator('#recipients-error')).toHaveText('수신자를 선택해 주세요.');
        await expect(recipientInput).toHaveAttribute('aria-invalid', 'true');
        await expect(recipientInput).toHaveAttribute('aria-errormessage', 'recipients-error');
        await expect(recipientInput).toBeFocused();
        await expect(
            page.locator('[data-form-error-summary="true"]')
                .getByRole('button', { name: '수신자: 수신자를 선택해 주세요.' }),
        ).toBeVisible();
        await expect(page).toHaveURL(/\/admin\/collaboration\/mail-send/);
        await expect(page.getByTestId('selected-recipient-badge')).toHaveCount(0);

        console.log('>>> Empty recipient submission blocked correctly');
    });

    /**
     * [2026-09-05 DEC-OPS-035] 수신자 찾기 — 사용자 탭에서 이름으로 고르면 화면은 esntlId 만 싣고
     * 서버가 등록된 이메일로 해석한다. 시드 사용자에는 이메일이 없으므로(R__seed_framework 는 연락처를
     * 넣지 않는다) 테스트가 먼저 내 프로필에 이메일을 등록한다 — 등록이 없으면 서버가 이름을 밝히며
     * 거부하는 것이 계약이다.
     */
    test('Mail: pick myself by name via recipient finder', async ({ page, request }) => {
        const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1').replace(/\/$/, '');
        const authData = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'playwright', '.auth', 'admin.json'), 'utf-8'));
        const adminToken: string | undefined = authData.cookies.find((c: { name: string; value: string }) => c.name === 'accessToken')?.value;
        expect(adminToken, 'admin accessToken 이 storageState 에 있어야 한다').toBeTruthy();
        const headers = { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' };

        // 0. 내 프로필에 이메일을 보장한다(PUT /users/me 는 userNm 필수 — 현재 값을 그대로 되돌려 준다).
        const meRes = await request.get(`${API_BASE}/users/me`, { headers });
        expect(meRes.ok()).toBeTruthy();
        const me: { userNm?: string; emlAddr?: string } = (await meRes.json()).data;
        expect(me.userNm, '현재 사용자 표시 이름이 있어야 피커로 찾을 수 있다').toBeTruthy();
        const email = me.emlAddr && me.emlAddr.includes('@') ? me.emlAddr : 'e2e-admin@example.com';
        const putRes = await request.put(`${API_BASE}/users/me`, { headers, data: { userNm: me.userNm, emlAddr: email } });
        expect(putRes.ok(), `내 프로필 갱신 실패: ${putRes.status()}`).toBeTruthy();

        const subject = `PICK ${Date.now()}`;
        await mailPage.navigateToSend();

        // 1. 수신자 찾기 → 사용자 탭 → 내 이름 검색 → 선택 추가
        await page.getByTestId('mail-recipient-picker-btn').click();
        const picker = page.getByRole('dialog', { name: '수신자 찾기' });
        await expect(picker).toBeVisible();
        await picker.getByLabel('사용자 검색어 입력').fill(me.userNm!);
        await picker.getByRole('button', { name: '검색' }).click();
        await picker.getByRole('checkbox', { name: `${me.userNm} 선택` }).first().click();
        await picker.getByRole('button', { name: /선택 추가/ }).click();
        await expect(picker).toBeHidden();

        const badge = page.getByTestId('selected-recipient-badge').filter({ hasText: me.userNm! });
        await expect(badge).toBeVisible();
        await expect(badge).toHaveAttribute('data-recipient-kind', 'user');
        // 사용자의 이메일 주소는 화면 어디에도 나타나지 않는다(연락처는 서버가 해석한다).
        await expect(page.getByText(email)).toHaveCount(0);

        // 2. 제목·본문 → 발송 → 이력에서 확인
        await page.getByTestId('mail-subject-input').fill(subject);
        await page.getByTestId('mail-content-textarea').fill('Recipient picked by name.');
        await page.getByTestId('mail-send-btn').click();
        await page.waitForURL(/\/mail-history/, { timeout: 15000 });
        await mailPage.verifyMailInHistory(subject);
    });
});
