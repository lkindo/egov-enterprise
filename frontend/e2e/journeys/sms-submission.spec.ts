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
        const smsContent = `E2E SMS 이력검증 ${suffix}`;
        const tracker = trackApiRequests(page);

        try {
            await page.goto('/admin/uss/ion/sms');
            await expect(page.getByRole('heading', { name: '문자 메시지 발송 관리', exact: true })).toBeVisible();
            const refreshBtn = page.getByRole('button', { name: '새로고침', exact: true });
            await waitForHydration(refreshBtn);

            await operationalPage.sendSms(formattedPhone, smsContent);

            const [refreshedRes] = await Promise.all([
                page.waitForResponse(res => new URL(res.url()).pathname.endsWith('/sms')
                    && res.request().method() === 'GET'),
                refreshBtn.click(),
            ]);
            expect(refreshedRes.status()).toBe(200);

            const conditionSelect = page.locator('#sms-search-condition');
            await expect(conditionSelect).toHaveValue('1');
            const keywordInput = page.getByLabel('문자 발송 이력 검색어');
            await keywordInput.fill(smsContent);
            await page.getByRole('button', { name: '조회', exact: true }).click();
            await expect(page.getByText(smsContent, { exact: true })).toBeVisible();

            await conditionSelect.selectOption('0');
            await keywordInput.fill(canonicalPhone);
            await page.getByRole('button', { name: '조회', exact: true }).click();

            const targetRow = page.getByRole('row').filter({ hasText: smsContent });
            await expect(targetRow).toBeVisible();
            await targetRow.getByRole('button', { name: '수신자 결과', exact: true }).click();

            const resultDialog = page.getByRole('dialog', { name: '수신자 전달 결과', exact: true });
            await expect(resultDialog).toBeVisible();
            await expect(resultDialog.getByText(canonicalPhone, { exact: true })).toBeVisible();

            await resultDialog.getByRole('button', { name: '결과 새로고침', exact: true }).click();
            await resultDialog.locator('[data-slot="button"]').filter({ hasText: '닫기' }).click();
            await expect(resultDialog).toBeHidden();
            await tracker.settled(refreshBtn);
        } finally {
            await page.goto('about:blank');
        }
    });
});
