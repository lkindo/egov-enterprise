import { expect,test } from '../fixtures/browser-test';
import { expectNoAccessibilityViolations } from '../fixtures/accessibility';
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
            // 진행 상태(role=status)가 사라지기를 기다리는 것과 동작 멈춤은 공용 감사(fixtures/accessibility.ts)가 한다 — 그 진행 문구
            // 패턴이 종전 이 spec 의 세 문구('페이지 콘텐츠를 불러오는 중'·'애플리케이션을 준비하는 중'·'보안 세션을 확인하는 중')를 모두 덮는다.
            await expect(page.getByRole('heading', { level: 1, name: '관리자 업무 현황' }))
                .toBeVisible({ timeout: 30000 });
            await expectNoAccessibilityViolations(page, '/admin');
        });
    });
});
