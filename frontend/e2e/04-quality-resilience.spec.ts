import { test, expect } from './fixtures/base-test';
import { AxeBuilder } from '@axe-core/playwright';

/**
 * [Tier 4] Quality & Resilience: Security, UX, A11y, Visual
 * 
 * 시스템의 비기능적 품질과 회복력을 검증합니다.
 * 1. 보안 (RBAC, CSRF, XSS)
 * 2. UX (낙관적 업데이트, 자동 저장)
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
                await page.goto(path);
                // Should redirect to dashboard or show unauthorized message
                await expect(page).not.toHaveURL(new RegExp(path));
                const bodyText = await page.innerText('body');
                expect(bodyText).toMatch(/권한|접근|Deny|Unauthorized|Unauthorized|Forbidden/i);
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
            await page.goto(`/admin/community/boards/detail?bbsId=${bbsId}&nttId=1108`); // Existing post
            
            const likeBtn = page.locator('button').filter({ hasText: /추천|좋아요|Like/i }).first();
            if (await likeBtn.isVisible()) {
                const initialCount = await likeBtn.innerText();
                await likeBtn.click();
                // UI should update immediately (Optimistic)
                const updatedCount = await likeBtn.innerText();
                console.log(`>>> Like count changed: ${initialCount} -> ${updatedCount}`);
                expect(updatedCount).not.toBe(initialCount);
            }
        });

        test('Resilience: Auto-save Draft Restoration', async ({ page }) => {
            await page.goto('/admin/community/boards/insertBoardArticle?bbsId=BBSMSTR_AAAAAAAAAAAA');
            const draftTitle = `Draft_${Date.now()}`;
            await page.locator('input[name="nttSj"]').fill(draftTitle);
            
            console.log('>>> Waiting for auto-save trigger...');
            await page.waitForTimeout(5000); // 3s interval in useAutoSaveDraft
            
            console.log('>>> Simulating crash (Refresh)');
            await page.reload();
            
            console.log('>>> Verifying restoration dialog');
            const restoreBtn = page.locator('button:has-text("복구"), button:has-text("Restore")').first();
            await expect(restoreBtn).toBeVisible({ timeout: 10000 });
            await restoreBtn.click();
            
            await expect(page.locator('input[name="nttSj"]')).toHaveValue(draftTitle);
        });
    });

    test.describe('Global Quality (A11y & Visual)', () => {
        test.use({ storageState: 'playwright/.auth/admin.json' });

        test('Accessibility Audit (axe-core)', async ({ page }) => {
            await page.goto('/admin');
            console.log('>>> Running A11y audit on Dashboard');
            const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
            expect(accessibilityScanResults.violations).toEqual([]);
        });

        test('Visual Regression Baseline', async ({ page }) => {
            await page.goto('/admin');
            // Wait for charts to animate
            await page.waitForTimeout(3000);
            console.log('>>> Capturing Dashboard Visual Snapshot');
            await expect(page).toHaveScreenshot('dashboard-baseline.png', {
                mask: [page.locator('.recharts-surface')], // Mask dynamic charts
                maxDiffPixelRatio: 0.1
            });
        });
    });

    test.describe('System Observability', () => {
        test.use({ storageState: 'playwright/.auth/admin.json' });

        test('Audit Log Consistency', async ({ page }) => {
            await page.goto('/admin/system/audit');
            console.log('>>> Verifying recent system activities');
            const auditRow = page.locator('tr').first();
            await expect(auditRow).toBeVisible();
            // Should contain timestamp and action
            await expect(auditRow).toContainText(/\d{4}-\d{2}-\d{2}/);
        });
    });
});
