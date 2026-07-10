import { test, expect } from './fixtures/base-test';

test.describe('Tier 20: Common Security & UI Validation', () => {
    test.use({ storageState: 'playwright/.auth/admin.json' });

    test('Session Integrity: Handling Token Clearance', async ({ page, context }) => {
        console.log('>>> Step 1: Navigating to a protected admin page');
        await page.goto('/admin/community/boards/master');
        await expect(page).toHaveURL(/.*master/);

        console.log('>>> Step 2: Clearing cookies and localStorage to simulate session expiration');
        await context.clearCookies();
        await page.evaluate(() => localStorage.clear());
        
        console.log('>>> Step 3: Attempting a protected action (refresh)');
        await page.reload();
        
        // Should be redirected to login
        await expect(page).toHaveURL(/.*login/, { timeout: 15000 });
        console.log('>>> Correctly redirected to login after session loss');
    });

    // [E2E 감사 Phase3 중복제거] 삭제됨: 'Search with Special Characters (Injection Prevention)' —
    // XSS/인젝션 검증은 22-deep-security-guard가 소유(실 dialog 가드 + 이스케이프 렌더 단언으로 재작성됨).
    // 기존 테스트는 body 가시성(tautology) + if(isVisible) 가드로 무단언 통과하던 false-green이었음.

    test('Navigation Integrity: Rapid Menu Switching', async ({ page }) => {
        const menus = [
            '/admin/community/boards/master',
            '/admin/system/menus',
            '/admin/system/programs',
            '/admin/community/boards/master'
        ];

        console.log('>>> Step 1: Rapidly switching between administrative menus');
        for (const url of menus) {
            await page.goto(url);
            // Verify breadcrumb or page header contains relevant keywords
            const header = page.locator('h1, h2').first();
            await expect(header).toBeVisible();
        }
        console.log('>>> Rapid navigation completed without system deadlock');
    });
});
