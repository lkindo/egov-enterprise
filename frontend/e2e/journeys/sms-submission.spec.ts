import { expect, test } from '../fixtures/browser-test';
import { trackApiRequests, waitForHydration } from '../fixtures/hydration';

test.describe('Operational Extension & Uncovered Modules', () => {
    test.use({ storageState: 'playwright/.auth/admin.json' });
    test("SMS 입력을 제출하고 접수 알림을 표시한다", async ({ operationalPage }) => {
        await operationalPage.gotoSms();
        // Send SMS (Mock/Real check)
        // We use a dummy number to test the UI flow and toast
        await operationalPage.sendSms('010-9999-8888', 'E2E Test Message from Antigravity');
    });

    test('문자 발송 이력을 조건별로 검색·새로고침하고 수신자 전달 결과를 조회한다', async ({ operationalPage, page }) => {
        const suffix = String(Date.now()).slice(-8);
        const formattedPhone = `010-${suffix.slice(0, 4)}-${suffix.slice(4, 8)}`;
        const canonicalPhone = `010${suffix}`;
        const otherSuffix = String(Number(suffix) + 1).padStart(8, '0').slice(-8);
        const otherFormattedPhone = `010-${otherSuffix.slice(0, 4)}-${otherSuffix.slice(4, 8)}`;
        const smsContent = `E2E SMS 이력검증 ${suffix}`;
        const otherSmsContent = `E2E SMS 대조군 ${suffix}`;
        const tracker = trackApiRequests(page);

        try {
            await page.goto('/admin/uss/ion/sms');
            await expect(page.getByRole('heading', { name: '문자 메시지 발송 관리', exact: true })).toBeVisible();
            const refreshBtn = page.getByRole('button', { name: '새로고침', exact: true });
            await waitForHydration(refreshBtn);

            await operationalPage.sendSms(otherFormattedPhone, otherSmsContent);
            await operationalPage.sendSms(formattedPhone, smsContent);

            const [refreshedRes] = await Promise.all([
                page.waitForResponse(res => new URL(res.url()).pathname.endsWith('/sms')
                    && res.request().method() === 'GET'),
                refreshBtn.click(),
            ]);
            expect(refreshedRes.status()).toBe(200);
            await expect(page.getByText(otherSmsContent, { exact: true })).toBeVisible();

            const conditionSelect = page.locator('#sms-search-condition');
            await expect(conditionSelect).toHaveValue('1');
            const keywordInput = page.getByLabel('문자 발송 이력 검색어');
            await keywordInput.fill(smsContent);
            const [contentSearchRes] = await Promise.all([
                page.waitForResponse(res => {
                    const url = new URL(res.url());
                    return url.pathname.endsWith('/sms')
                        && url.searchParams.get('searchCondition') === '1'
                        && url.searchParams.get('searchKeyword') === smsContent
                        && res.request().method() === 'GET';
                }),
                page.getByRole('button', { name: '조회', exact: true }).click(),
            ]);
            expect(contentSearchRes.status()).toBe(200);
            await expect(page.getByText(smsContent, { exact: true })).toBeVisible();
            await expect(page.getByText(otherSmsContent, { exact: true })).toHaveCount(0);

            await conditionSelect.selectOption('0');
            await keywordInput.fill(canonicalPhone);
            const [phoneSearchRes] = await Promise.all([
                page.waitForResponse(res => {
                    const url = new URL(res.url());
                    return url.pathname.endsWith('/sms')
                        && url.searchParams.get('searchCondition') === '0'
                        && url.searchParams.get('searchKeyword') === canonicalPhone
                        && res.request().method() === 'GET';
                }),
                page.getByRole('button', { name: '조회', exact: true }).click(),
            ]);
            expect(phoneSearchRes.status()).toBe(200);

            const targetRow = page.getByRole('row').filter({ hasText: smsContent });
            await expect(targetRow).toBeVisible();
            await expect(page.getByText(otherSmsContent, { exact: true })).toHaveCount(0);
            await targetRow.getByRole('button', { name: '수신자 결과', exact: true }).click();

            const resultDialog = page.getByRole('dialog', { name: '수신자 전달 결과', exact: true });
            await expect(resultDialog).toBeVisible();
            await expect(resultDialog.getByText(canonicalPhone, { exact: true })).toBeVisible();

            const [recipientReloadRes] = await Promise.all([
                page.waitForResponse(res => new URL(res.url()).pathname.endsWith('/recipients')
                    && res.request().method() === 'GET'),
                resultDialog.getByRole('button', { name: '결과 새로고침', exact: true }).click(),
            ]);
            expect(recipientReloadRes.status()).toBe(200);
            await resultDialog.locator('[data-slot="button"]').filter({ hasText: '닫기' }).click();
            await expect(resultDialog).toBeHidden();
            await tracker.settled(refreshBtn);
        } finally {
            await page.goto('about:blank');
        }
    });
});
