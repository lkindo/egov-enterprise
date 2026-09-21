import { expect,test } from '../fixtures/browser-test';
test.describe('Quality & Resilience', () => {
    test.describe('System Observability', () => {
        test.use({ storageState: 'playwright/.auth/admin.json' });
        test('Audit Log Consistency', async ({ page }) => {
            await page.goto('/admin/system/audit');
            console.log('>>> Verifying recent system activities');
            // [E2E 감사 B] both-branches-pass 제거 — 로그인 등 활동으로 감사 로그가 반드시 존재하므로
            // 타임스탬프를 하드 단언한다(과거: empty-state도 성공으로 인정해 빈/깨진 감사 페이지가 통과했음).
            // ':text-matches'는 유효한 Playwright CSS 의사클래스가 아니라 0건 매칭됐음 → getByText(regex)로 정정.
            const auditTimestamp = page.getByText(/\d{4}-\d{2}-\d{2}/).first();
            await expect(auditTimestamp).toBeVisible({ timeout: 20000 });
            await expect(auditTimestamp).toContainText(/\d{4}-\d{2}-\d{2}/);
            console.log('>>> Audit log entry verified.');
        });
    });
});
