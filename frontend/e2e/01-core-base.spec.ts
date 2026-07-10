import { test, expect } from './fixtures/base-test';
import { TEST_CREDENTIALS } from './test-credentials';
import { injectAxe, checkA11y } from '@axe-core/playwright';

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
        await page.locator('input[name="id"], input[name="userId"]').fill(TEST_CREDENTIALS.admin.id);
        await page.locator('input[name="password"]').fill(TEST_CREDENTIALS.admin.password);
        await page.locator('button[type="submit"]').click();
        
        console.log('>>> Step 3: Redirection to Admin Hub');
        await expect(page).toHaveURL(/\/admin/, { timeout: 30000 });
        // dashboard.badge의 값인 '전자정부 5.0' 확인 (또는 실제 메인 레이블)
        await expect(page.locator('text=전자정부 5.0').first()).toBeVisible({ timeout: 15000 });
    });

    test('Accessibility Audit for Login Page', async ({ page }) => {
        await page.goto('/login?e2e=true');
        await injectAxe(page);
        await checkA11y(page, undefined, {
            axeOptions: {
                rules: {
                    'color-contrast': { enabled: false }, // CI 환경 테마 가변성 방어
                }
            },
            detailedReport: true,
        });
    });

    test.describe('Dashboard Integrity (Session Preserved)', () => {
        test.use({ storageState: 'playwright/.auth/admin.json' });

        test.beforeEach(async ({ page }) => {
            await page.goto('/admin');
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
            await expect(page.locator('text=보안 감사 이력').first()).toBeVisible();
            await expect(page.locator('text=활동 인텔리전스').first()).toBeVisible();
        });

        test('Accessibility Audit for Admin Dashboard', async ({ page }) => {
            await injectAxe(page);
            await checkA11y(page, undefined, {
                axeOptions: {
                    rules: {
                        'color-contrast': { enabled: false }, // CI 환경 테마 가변성 방어
                    }
                },
                detailedReport: true,
            });
        });

        test('Global Layout & Navigation Mapping', async ({ page }) => {
            console.log('>>> Step 1: Sidebar Visibility');
            const sidebar = page.locator('aside').first();
            await expect(sidebar).toBeVisible();

            console.log('>>> Step 2: Sidebar Menu Interaction');
            const menuTrigger = page.locator('nav a[href*="/admin/"]').first();
            await expect(menuTrigger).toBeVisible();
            
            // [E2E 감사 B] 조건부 breadcrumb 단언 제거 — /admin 루트에서 breadcrumb는 선택적이라
            // if(isVisible) 가드가 항상 스킵되던 false-green 스텝이었음. 위 사이드바/네비 단언으로 레이아웃 무결성 검증.
        });

        test('Logout Redirection and Session Cleanup', async ({ page }) => {
            console.log('>>> Step 1: Triggering User Menu');
            const profileTrigger = page.locator('button[aria-label="사용자 계정 메뉴"]').first();
            await expect(profileTrigger).toBeVisible({ timeout: 15000 });
            await profileTrigger.click();
            
            console.log('>>> Step 2: Logout Action');
            const logoutButton = page.getByRole('button', { name: /로그아웃|Logout/i });
            await expect(logoutButton).toBeVisible();
            await logoutButton.click();
            
            console.log('>>> Step 3: Redirection Check');
            await expect(page).toHaveURL(/\/login/, { timeout: 15000 });
        });
    });

    test.describe('User Portal Integrity (Session Preserved)', () => {
        test.use({ storageState: 'playwright/.auth/user.json' });

        test.beforeEach(async ({ page }) => {
            console.log('>>> Navigating to User Portal Home');
            await page.goto('/');
        });

        test('User Unified Dashboard Rendering', async ({ page }) => {
            console.log('>>> Step 1: Verifying User Layout & Global Navigation');
            const header = page.locator('header').first();
            await expect(header).toBeVisible();
            
            console.log('>>> Step 2: Verifying Main User Elements');
            // User Portal 특정 대시보드 또는 위젯 텍스트 확인 (일반적으로 나타나는 요소)
            await expect(page.locator('text=전자정부').first()).toBeVisible();
        });
        
        test('User Profile and Logout', async ({ page }) => {
            // [E2E 감사 B] isVisible 가드 제거 — 프로필 버튼이 없으면 실패시키고, 제목이 약속한 '로그아웃'을 실제 수행한다.
            // (과거: 유일한 expect가 가드 안에 있어 버튼 부재 시 무단언 통과, 존재 시 가드 조건과 동일한 tautology였음)
            console.log('>>> Step 1: Opening User Account Menu');
            // 공유 헤더(header.tsx)의 계정 버튼 aria-label — 관리자 로그아웃 테스트와 동일 셀렉터로 정합.
            const profileButton = page.locator('button[aria-label="사용자 계정 메뉴"]').first();
            await expect(profileButton).toBeVisible({ timeout: 15000 });
            await profileButton.click();

            console.log('>>> Step 2: Logout Action');
            const logoutButton = page.getByRole('button', { name: /로그아웃|Logout/i }).first();
            await expect(logoutButton).toBeVisible({ timeout: 10000 });
            await logoutButton.click();

            console.log('>>> Step 3: Redirect to Login');
            await expect(page).toHaveURL(/\/login/, { timeout: 15000 });
        });
    });
});
