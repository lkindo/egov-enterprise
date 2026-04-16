import { test, expect } from '@playwright/test';

/**
 * Visual Regression Testing
 * 
 * 주요 화면의 스냅샷을 비교하여 의도치 않은 UI 변경을 감지합니다.
 * 
 * 실행 방법:
 * - 스냅샷 생성 (첫 번째 실행): npm run test:e2e -- --update-snapshots
 * - 스냅샷 비교 (일반 실행): npm run test:e2e
 * - 특정 테스트만 실행: npm run test:e2e -- visual-regression.spec.ts
 */

test.describe('Visual Regression - Admin Pages', () => {
    test.use({ storageState: 'playwright/.auth/admin.json' });

    test('should match dashboard snapshot', async ({ page }) => {
        await page.goto('/admin', { waitUntil: 'networkidle' });
        await expect(page.locator('aside')).toBeVisible({ timeout: 15000 });
        await page.waitForTimeout(2000); // Wait for animations to complete

        // 전체 페이지 스냅샷
        await expect(page).toHaveScreenshot('admin-dashboard-full.png', {
            fullPage: true,
            maxDiffPixels: 100,
        });
    });

    test('should match login page snapshot', async ({ page }) => {
        // 로그아웃 상태로 로그인 페이지 접근
        await page.goto('/login', { waitUntil: 'networkidle' });
        await expect(page.locator('form')).toBeVisible({ timeout: 15000 });
        await page.waitForTimeout(1000);

        await expect(page).toHaveScreenshot('login-page.png', {
            fullPage: true,
            maxDiffPixels: 100,
        });
    });

    test('should match common code management snapshot', async ({ page }) => {
        await page.goto('/admin/system/common-code', { waitUntil: 'networkidle' });
        await expect(page.locator('aside')).toBeVisible({ timeout: 15000 });
        await page.waitForTimeout(2000);

        await expect(page).toHaveScreenshot('admin-common-codes.png', {
            fullPage: true,
            maxDiffPixels: 100,
        });
    });

    test('should match menu management snapshot', async ({ page }) => {
        await page.goto('/admin/system/menus', { waitUntil: 'networkidle' });
        await expect(page.locator('aside')).toBeVisible({ timeout: 15000 });
        await page.waitForTimeout(2000);

        await expect(page).toHaveScreenshot('admin-menus.png', {
            fullPage: true,
            maxDiffPixels: 100,
        });
    });

    test('should match user management snapshot', async ({ page }) => {
        await page.goto('/admin/user/manage', { waitUntil: 'networkidle' });
        await expect(page.locator('aside')).toBeVisible({ timeout: 15000 });
        await page.waitForTimeout(2000);

        await expect(page).toHaveScreenshot('admin-users.png', {
            fullPage: true,
            maxDiffPixels: 100,
        });
    });

    test('should match board management snapshot', async ({ page }) => {
        await page.goto('/admin/community/boards/selectBoardList', { waitUntil: 'networkidle' });
        await expect(page.locator('aside')).toBeVisible({ timeout: 15000 });
        await page.waitForTimeout(2000);

        await expect(page).toHaveScreenshot('admin-boards.png', {
            fullPage: true,
            maxDiffPixels: 100,
        });
    });

    test('should match statistics dashboard snapshot', async ({ page }) => {
        await page.goto('/admin/stats/board', { waitUntil: 'networkidle' });
        await expect(page.locator('aside')).toBeVisible({ timeout: 15000 });
        await page.waitForTimeout(3000); // Wait for charts to render

        await expect(page).toHaveScreenshot('admin-statistics.png', {
            fullPage: true,
            maxDiffPixels: 150, // Charts may have minor rendering differences
        });
    });
});

test.describe('Visual Regression - Responsive Breakpoints', () => {
    test.use({ storageState: 'playwright/.auth/admin.json' });

    test('should match mobile dashboard snapshot', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
        await page.goto('/admin', { waitUntil: 'networkidle' });
        await page.waitForTimeout(2000);

        await expect(page).toHaveScreenshot('admin-dashboard-mobile-375px.png', {
            fullPage: true,
            maxDiffPixels: 100,
        });
    });

    test('should match tablet dashboard snapshot', async ({ page }) => {
        await page.setViewportSize({ width: 768, height: 1024 }); // iPad
        await page.goto('/admin', { waitUntil: 'networkidle' });
        await page.waitForTimeout(2000);

        await expect(page).toHaveScreenshot('admin-dashboard-tablet-768px.png', {
            fullPage: true,
            maxDiffPixels: 100,
        });
    });

    test('should match desktop dashboard snapshot', async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 }); // Full HD
        await page.goto('/admin', { waitUntil: 'networkidle' });
        await page.waitForTimeout(2000);

        await expect(page).toHaveScreenshot('admin-dashboard-desktop-1920px.png', {
            fullPage: true,
            maxDiffPixels: 100,
        });
    });
});

test.describe('Visual Regression - Dark Mode', () => {
    test.use({ storageState: 'playwright/.auth/admin.json' });

    test('should match dark mode dashboard snapshot', async ({ page }) => {
        // 다크 모드 활성화
        await page.goto('/admin', { waitUntil: 'networkidle' });
        
        // 테마 토글 찾기 및 클릭 (존재하는 경우)
        const themeToggle = page.getByRole('button', { name: /theme|dark|light|테마|다크|라이트/i }).first();
        if (await themeToggle.isVisible().catch(() => false)) {
            await themeToggle.click();
            await page.waitForTimeout(1000);
        } else {
            // 수동으로 다크 모드 클래스 추가
            await page.evaluate(() => {
                document.documentElement.classList.add('dark');
            });
            await page.waitForTimeout(1000);
        }

        await expect(page).toHaveScreenshot('admin-dashboard-dark-mode.png', {
            fullPage: true,
            maxDiffPixels: 100,
        });
    });
});
