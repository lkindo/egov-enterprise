import { test, expect } from './fixtures/base-test';

/**
 * [Tier 1] Core Base: Authentication & Dashboard Hub
 * 
 * 이 테스트는 시스템의 가장 기본적인 기동성을 확인합니다.
 * 1. 로그인/로그아웃 흐름
 * 2. 대시보드 위젯 및 차트 렌더링
 * 3. 전역 레이아웃(사이드바, 헤더) 무결성
 */

test.describe('Tier 1: Core Base (Auth & Dashboard)', () => {
    
    test('User Authentication Flow (UI based)', async ({ page }) => {
        console.log('>>> Step 1: Login UI Check');
        await page.goto('/login?e2e=true');
        await expect(page.locator('input[name="id"], input[name="userId"]')).toBeVisible();
        
        console.log('>>> Step 2: Login Action');
        await page.locator('input[name="id"], input[name="userId"]').fill('webmaster');
        await page.locator('input[name="password"]').fill('1');
        await page.locator('button[type="submit"]').click();
        
        console.log('>>> Step 3: Redirection to Admin Hub');
        await expect(page).toHaveURL(/\/admin/, { timeout: 30000 });
        // dashboard.badge의 값인 '전자정부 5.0' 확인 (또는 실제 메인 레이블)
        await expect(page.locator('text=전자정부 5.0').first()).toBeVisible();
    });

    test.describe('Dashboard Integrity (Session Preserved)', () => {
        test.use({ storageState: 'playwright/.auth/admin.json' });

        test.beforeEach(async ({ page }) => {
            await page.goto('/admin', { waitUntil: 'networkidle' });
        });

        test('Widgets and Charts Rendering', async ({ page }) => {
            console.log('>>> Step 1: Verifying Stat Cards');
            await expect(page.locator('text=ID 레지스트리').first()).toBeVisible();
            await expect(page.locator('text=보안 거버넌스').first()).toBeVisible();

            console.log('>>> Step 2: Verifying Real-time Charts');
            // Recharts generates SVG elements with .recharts-surface
            const charts = page.locator('.recharts-surface');
            await expect(charts.first()).toBeVisible({ timeout: 15000 });
            
            console.log('>>> Step 3: Verifying Task & Activity Lists');
            // Update to match current Dashboard UI
            await expect(page.locator('text=Audit History').first()).toBeVisible();
            await expect(page.locator('text=Activity Intelligence').first()).toBeVisible();
        });

        test('Global Layout & Navigation Mapping', async ({ page }) => {
            console.log('>>> Step 1: Sidebar Visibility');
            const sidebar = page.locator('aside');
            await expect(sidebar).toBeVisible();

            console.log('>>> Step 2: Sidebar Menu Interaction');
            const menuTrigger = page.locator('nav a[href*="/admin/"]').first();
            await expect(menuTrigger).toBeVisible();
            
            console.log('>>> Step 3: Breadcrumb Integrity');
            const breadcrumb = page.locator('ol[aria-label="Breadcrumb"], .breadcrumb');
            if (await breadcrumb.isVisible()) {
                await expect(breadcrumb).toContainText('Admin');
            }
        });

        test('Logout Redirection and Session Cleanup', async ({ page }) => {
            console.log('>>> Step 1: Triggering User Menu');
            const profileTrigger = page.locator('button[aria-label="사용자 계정 메뉴"]').first();
            await profileTrigger.click();
            
            console.log('>>> Step 2: Logout Action');
            const logoutButton = page.getByRole('button', { name: /로그아웃|Logout/i });
            await expect(logoutButton).toBeVisible();
            await logoutButton.click();
            
            console.log('>>> Step 3: Redirection Check');
            await expect(page).toHaveURL(/\/login/, { timeout: 15000 });
        });
    });
});
