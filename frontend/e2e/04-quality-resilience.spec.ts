import { test, expect } from './fixtures/base-test';
import { AxeBuilder } from '@axe-core/playwright';

/**
 * [Tier 4] Quality & Resilience: Security, UX, A11y, Visual
 * 
 * 테스트의 비기능적 품질과 회복탄력성을 검증합니다.
 * 1. 보안 (RBAC, CSRF, XSS)
 * 2. UX (실시간 업데이트, 자동 저장)
 * 3. 접근성 (WCAG 2.1) 및 시각적 회귀
 * 4. 관측성 (감사 로그, 콘솔 가드)
 */

test.describe('Tier 4: Quality & Resilience', () => {
    
    test.describe('Security & RBAC Integrity', () => {
        test.use({ storageState: 'playwright/.auth/user.json' });

        test('Denied Admin Access for Regular User', async ({ page }) => {
            const adminPaths = ['/admin/user/manage', '/admin/system/audit'];
            for (const path of adminPaths) {
                console.log(`>>> Checking restricted access to ${path}`);
                await page.goto(path, { waitUntil: 'domcontentloaded' });
                // Should redirect to dashboard or show unauthorized message
                await expect(page).not.toHaveURL(new RegExp(path), { timeout: 10000 });
                
                // Middleware redirects to / with auth_error=unauthorized
                const url = page.url();
                if (url.includes('auth_error=unauthorized') || url === 'http://localhost:3001/') {
                    console.log(`>>> Access successfully denied for ${path} (Redirected)`);
                } else {
                    const bodyText = await page.innerText('body');
                    expect(bodyText).toMatch(/권한|접근|Deny|Unauthorized|Forbidden/i);
                }
            }
        });

        test('CSRF Protection Verification', async ({ page }) => {
            console.log('>>> Attempting state-change without valid CSRF');
            const response = await page.request.post('/api/v1/admin/system/users', {
                headers: { 'X-XSRF-TOKEN': 'invalid-token' },
                data: { userId: 'csrf_attacker' }
            });
            expect([403, 401]).toContain(response.status());
        });
    });

    test.describe('Advanced UX & Performance', () => {
        test.use({ storageState: 'playwright/.auth/admin.json' });

        test('Optimistic UI: Post Like/Reaction', async ({ page }) => {
            const bbsId = 'BBSMSTR_AAAAAAAAAAAA';
            await page.goto(`/admin/community/boards/detail?bbsId=${bbsId}&pstId=1108`); // Existing post
            
            // [E2E 감사 B] isVisible 가드 제거 — 추천 버튼이 없으면 실패시킨다(과거: 가드로 무단언 통과).
            const likeBtn = page.locator('button').filter({ hasText: /추천|좋아요|Like/i }).first();
            await expect(likeBtn).toBeVisible({ timeout: 15000 });
            const initialCount = await likeBtn.innerText();
            await likeBtn.click();
            // 낙관적 UI: 즉시 카운트가 변해야 한다.
            await expect(likeBtn).not.toHaveText(initialCount, { timeout: 10000 });
        });

        test('Resilience: Auto-save Draft Restoration', async ({ page }) => {
            await page.goto('/admin/community/boards/insert-board-article?bbsId=BBSMSTR_AAAAAAAAAAAA');
            
            // Set up dialog listener BEFORE the action that triggers it (reload/refresh)
            page.on('dialog', async dialog => {
                console.log(`>>> Dialog appeared: ${dialog.message()}`);
                await dialog.accept();
            });

            const draftTitle = `Draft_${Date.now()}`;
            await page.locator('input[name="pstTtl"]').fill(draftTitle);
            await page.locator('.ProseMirror').fill('This is a test content for auto-save verification.');
            
            console.log('>>> Waiting for auto-save trigger...');
            await page.waitForTimeout(5000); 
            
            console.log('>>> Simulating crash (Refresh)');
            await page.reload();
            
            console.log('>>> Verifying restoration');
            // The dialog should be automatically accepted by the listener
            await expect(page.locator('input[name="pstTtl"]')).toHaveValue(draftTitle, { timeout: 15000 });
            await expect(page.locator('.ProseMirror')).toContainText('auto-save verification');
        });
    });

    test.describe('Global Quality (A11y & Visual)', () => {
        test.use({ storageState: 'playwright/.auth/admin.json' });

        test('Accessibility Audit (axe-core)', async ({ page }) => {
            await page.goto('/admin');
            console.log('>>> Running A11y audit on Dashboard');
            const accessibilityScanResults = await new AxeBuilder({ page })
                .disableRules(['heading-order', 'color-contrast'])
                .analyze();
            expect(accessibilityScanResults.violations).toEqual([]);
        });

        test('Visual Regression Baseline', async ({ page }) => {
            await page.goto('/admin');
            // Wait for charts to animate
            await page.waitForTimeout(3000);
            console.log('>>> Capturing Dashboard Visual Snapshot');
            await expect(page).toHaveScreenshot('dashboard-baseline.png', {
                mask: [
                    page.locator('.recharts-surface'), // Mask dynamic charts
                    page.locator('.tabular-nums'), // Mask dynamic numbers
                    page.locator('.custom-scrollbar') // Mask dynamic scrollbar contents (Audit History)
                ],
                // [E2E 감사 C6] 30%(0.3) 허용치는 사실상 VRT를 무력화했음 → 1%로 강화.
                // 동적 영역은 위 mask로만 처리한다. (서버 기동 후 baseline 재캡처가 필요할 수 있음)
                maxDiffPixelRatio: 0.01
            });
        });
    });

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