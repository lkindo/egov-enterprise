import { test, expect } from '@playwright/test';

test.describe('Integrated Hub Navigation & UX Verification', () => {
    test.use({ storageState: 'playwright/.auth/admin.json' });

    test.beforeEach(async ({ page }) => {
        // Bypass onboarding tour
        await page.addInitScript(() => {
            window.localStorage.setItem('egov_smart_tour_v1', 'true');
        });

        await page.goto('/admin/dashboard', { waitUntil: 'domcontentloaded' });
    });

    test('Survey Hub: should correctly activate tabs based on URL params', async ({ page }) => {
        // Test 'Manage' tab
        await page.goto('/admin/survey/hub?tab=manage');
        await expect(page.getByRole('tab', { name: '설문 관리' })).toHaveAttribute('data-state', 'active', { timeout: 15000 });
        
        // Test 'Stats' tab
        await page.goto('/admin/survey/hub?tab=stats');
        await expect(page.getByRole('tab', { name: '결과 통계' })).toHaveAttribute('data-state', 'active', { timeout: 15000 });
    });

    test('Monitoring Hub: should correctly activate tabs based on URL params', async ({ page }) => {
        // Test 'Security' tab
        await page.goto('/admin/system/monitoring/hub?tab=security');
        // Monitoring Hub uses custom buttons, not Radix Tabs
        const securityBtn = page.getByRole('button', { name: '보안 감사 매트릭스' });
        await expect(securityBtn).toHaveClass(/bg-slate-900/, { timeout: 15000 });
        await expect(page.getByText('보안 감사 매트릭스')).toBeVisible();

        // Test 'Health' tab (maps to 'OBSERVABILITY' / '인프라 가동성 정보')
        await page.goto('/admin/system/monitoring/hub?tab=health');
        const healthBtn = page.getByRole('button', { name: '인프라 가동성 정보' });
        await expect(healthBtn).toHaveClass(/bg-slate-900/, { timeout: 15000 });
        await expect(page.getByText('인프라 가동성 정보')).toBeVisible();
    });

    test('Work Hub: should correctly activate CALENDAR tab', async ({ page }) => {
        await page.goto('/admin/work-hub?tab=calendar');
        const calTab = page.locator('button', { hasText: 'CALENDAR' });
        await expect(calTab).toBeVisible({ timeout: 15000 });
        await expect(calTab).toHaveClass(/bg-white/);
        await expect(page.getByText('통합 스마트 캘린더')).toBeVisible();
    });

    test('Direct URL Redirection Logic', async ({ page }) => {
        const routes = [
            { url: '/admin/survey/hub?tab=manage' },
            { url: '/admin/system/monitoring/hub?tab=security' },
            { url: '/admin/work-hub?tab=calendar' }
        ];

        for (const route of routes) {
            await page.goto(route.url);
            await expect(page).toHaveURL(new RegExp(route.url.replace('?', '\\?')));
        }
    });

    test('Sidebar Sidebar/Menu UX Integration', async ({ page }) => {
        await page.goto('/admin/dashboard');
        
        // 1. Expanded Navigation Check for Monitoring
        // Use regex for flexible matching (handles emojis)
        const headerMenu = page.locator('header nav').getByText(/시스템 관리 센터/);
        await expect(headerMenu).toBeVisible({ timeout: 15000 });
        await headerMenu.click();
        
        // Wait for sidebar to load and sub-menu to be visible
        // Log all sidebar items if not found
        const sidebar = page.locator('aside');
        const monitoringMenu = sidebar.getByText(/감사.*통계.*모니터링/, { exact: false });
        await expect(monitoringMenu).toBeVisible({ timeout: 15000 });
        await monitoringMenu.click();
        
        // Click '시스템 상태 모니터링' (mapped to ?tab=health)
        // May need to wait for expanding animation
        const healthMenu = page.locator('aside').getByText('시스템 상태 모니터링').first();
        await expect(healthMenu).toBeVisible({ timeout: 15000 });
        await healthMenu.click();
        
        await expect(page).toHaveURL(/.*tab=health/);
        const healthBtn = page.getByRole('button', { name: '인프라 가동성 정보' });
        await expect(healthBtn).toHaveClass(/bg-slate-900/);
    });
});
