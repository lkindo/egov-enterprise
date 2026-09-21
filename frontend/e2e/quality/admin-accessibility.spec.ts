import AxeBuilder from '@axe-core/playwright';
import { Page } from '@playwright/test';
import { expect,test } from '../fixtures/browser-test';
async function stabilizeAccessibilityAudit(page: Page) {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addStyleTag({
        content: `
            *, *::before, *::after {
                animation-duration: 0s !important;
                animation-delay: 0s !important;
                transition-duration: 0s !important;
                transition-delay: 0s !important;
            }
        `,
    });
    await page.evaluate(() => new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    }));
}
test.describe('Core Base (Auth & Dashboard)', () => {
    test.describe('Dashboard Integrity (Session Preserved)', () => {
        test.use({ storageState: 'playwright/.auth/admin.json' });
        test.beforeEach(async ({ page }) => {
            await page.emulateMedia({ reducedMotion: 'reduce' });
            await page.goto('/admin');
        });
        test('Accessibility Audit for Admin Dashboard', async ({ page }) => {
            // [2026-07-27] 렌더 완료를 먼저 기다린다. 종전에는 최외곽 Suspense 폴백("보안 세션을 확인하는 중...")
            // 상태에서 감사가 돌아 **스피너를 검사**했고, 그래서 landmark/heading 위반이 나왔다(감사 대상 오인).
            // 공통 loading/Suspense 폴백도 sr-only h1을 갖는다. 임의 h1이 아니라
            // 관리자 대시보드의 정확한 제목을 기다려 transient spinner 감사를 막는다.
            await expect(page.getByRole('heading', { level: 1, name: '관리자 업무 현황' }))
                .toBeVisible({ timeout: 30000 });
            await expect(page.locator('[role="status"]').filter({
                hasText: /^(?:페이지 콘텐츠를 불러오는 중|애플리케이션을 준비하는 중|보안 세션을 확인하는 중)/,
            })).toHaveCount(0);
            await stabilizeAccessibilityAudit(page);
            const a11y = await new AxeBuilder({ page }).analyze();
            expect(a11y.violations, JSON.stringify(a11y.violations.map((v) => v.id))).toEqual([]);
        });
    });
});
