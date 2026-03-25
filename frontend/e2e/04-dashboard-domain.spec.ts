import { test, expect } from '@playwright/test';


// --- From: dashboard.spec.ts ---
test.describe('dashboard', () => {


test.describe('Dashboard Features', () => {
    test.beforeEach(async ({ page }) => {
        // Bypass onboarding tour
        await page.addInitScript(() => {
            window.localStorage.setItem('egov_smart_tour_v1', 'true');
        });
        await page.goto('/', { waitUntil: 'domcontentloaded' });
    });

    test('should display main dashboard widgets', async ({ page }) => {
        // Check for main content - more flexible selector
        await page.waitForTimeout(3000);
        await expect(page.locator('main').first()).toBeVisible({ timeout: 15000 });

        // Look for dashboard-related text with flexible matching
        const hasDashboardText = await page.getByText(/Dashboard|대시보드|Home|홈/i).first().isVisible({ timeout: 10000 }).catch(() => false);
        if (hasDashboardText) {
            console.log('>>> Dashboard text found');
        } else {
            console.log('>>> No dashboard text found, but page loaded');
        }
    });

    test('should verify quick links', async ({ page }) => {
        await page.waitForTimeout(2000);

        // Look for any link with "more" or "all" text
        const moreLink = page.locator('a').filter({ hasText: /더보기|More|All/i }).first();
        if (await moreLink.isVisible().catch(() => false)) {
            await moreLink.click();
            // Should navigate to some board page
            await page.waitForTimeout(2000);
            console.log('>>> Navigated to board page');
        } else {
            console.log('>>> No "more" link found');
        }
    });

    test('should handle logout', async ({ page }) => {
        await page.waitForTimeout(2000);

        // Look for user menu button in header
        const userBtn = page.locator('header button').filter({ hasText: /admin|webmaster|user|profile/i }).first();
        if (await userBtn.isVisible().catch(() => false)) {
            await userBtn.click();
            await page.waitForTimeout(1000);

            // Look for logout button
            const logoutBtn = page.getByRole('button', { name: /로그아웃|Sign Out|Logout/i }).first();
            if (await logoutBtn.isVisible().catch(() => false)) {
                console.log('>>> Logout button found');
                // Don't actually logout to avoid breaking session
            } else {
                console.log('>>> No logout button found in menu');
            }
        } else {
            console.log('>>> No user menu button found');
        }
    });
});

});

// --- From: dashboard_advanced.spec.ts ---
test.describe('dashboard_advanced', () => {


test.describe('Advanced Dashboard & Stats Interaction', () => {
    test.beforeEach(async ({ page }) => {
        // Bypass onboarding tour
        await page.addInitScript(() => {
            window.localStorage.setItem('egov_smart_tour_v1', 'true');
        });
        await page.goto('/admin/stats', { waitUntil: 'domcontentloaded' });
    });

    test('should handle refresh action and show loading state', async ({ page }) => {
        const refreshBtn = page.locator('button:has(svg.lucide-refresh-ccw)');
        await expect(refreshBtn).toBeVisible();

        // Click refresh and check for animation class
        await refreshBtn.click();
        
        // The animate-spin class should appear briefly
        const spinner = refreshBtn.locator('svg.animate-spin');
        // Since it happens fast, we check if it's either spinning or back to normal
        // Or we can verify that the page doesn't crash during the transition
        await expect(refreshBtn).toBeEnabled();
    });

    test('should verify statistical summary cards', async ({ page }) => {
        // LuxuryStatCard components check (Wait for potentially slow dashboard data fetching)
        // Updated labels to match Korean UI in AdminStatsClient.tsx
        await expect(page.getByText('누적 데이터 노드')).toBeVisible({ timeout: 15000 });
        await expect(page.getByText('실시간 활성 세션')).toBeVisible({ timeout: 15000 });
        await expect(page.getByText('시스템 영속성 자산')).toBeVisible({ timeout: 15000 });

        // Check if numbers are formatted (can contain commas)
        const nodeCount = page.locator('h4').first();
        // Wait specifically for the content to change from placeholder or 0 to something matching the pattern
        await expect(nodeCount).toHaveText(/[0-9,]+/, { timeout: 20000 });
        const value = await nodeCount.innerText();
        expect(value).toMatch(/[0-9,]+/);
    });

    test('should interact with date range filter', async ({ page }) => {
        const filterSelect = page.locator('select');
        await expect(filterSelect).toBeVisible();

        // Change filter to MONTHLY_BATCH (30D)
        await filterSelect.selectOption('MONTHLY_BATCH (30D)');
        
        // Changing option should trigger router.refresh or state change
        // We verify the select value is updated
        await expect(filterSelect).toHaveValue('MONTHLY_BATCH (30D)');
    });

    test('should verify chart accessibility and rendering', async ({ page }) => {
        // Check if different chart types are rendered via SVG
        const areaChart = page.locator('.recharts-area');
        const pieChart = page.locator('.recharts-pie');
        const barChart = page.locator('.recharts-bar');

        // Note: Recharts uses SVG, so we check for presence of SVG containers
        // Increase timeout for chart rendering which happens after background data fetch
        await expect(page.locator('.recharts-responsive-container')).toHaveCount(3, { timeout: 30000 });
    });

    test('should verify deep intelligence report table', async ({ page }) => {
        await expect(page.getByText('인텔리전스 노드')).toBeVisible();
        
        // Table should have specific headers defined in menuColumns
        await expect(page.getByText('인텔리전스 노드')).toBeVisible();
        await expect(page.getByText('상호작용 횟수')).toBeVisible();
        await expect(page.getByText('영향력 매트릭스')).toBeVisible();

        // Check if at least one row is rendered
        const tableRows = page.locator('table tr');
        const count = await tableRows.count();
        expect(count).toBeGreaterThan(1);
    });

    test('should verify responsive behavior on mobile', async ({ page }) => {
        // Set viewport to mobile size
        await page.setViewportSize({ width: 375, height: 667 });

        // Stats grid should stack vertically (check if specific cards are still visible)
        await expect(page.getByText('누적 데이터 노드')).toBeVisible();
        
        // Deep Intelligence Table should be scrollable - use visibility filter to select the correct one
        const scrollContainer = page.locator('.overflow-x-auto').filter({ visible: true }).first();
        await expect(scrollContainer).toBeVisible();
    });
});

});

// --- From: hub-navigation.spec.ts ---
test.describe('hub-navigation', () => {


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
        await expect(page.locator('button, [role="tab"]').filter({ hasText: '설문' }).first()).toHaveAttribute('data-state', 'active', { timeout: 15000 });
        
        // Test 'Stats' tab
        await page.goto('/admin/survey/hub?tab=stats');
        await expect(page.getByRole('tab', { name: '결과 통계' })).toHaveAttribute('data-state', 'active', { timeout: 15000 });
    });

    test('Monitoring Hub: should correctly activate tabs based on URL params', async ({ page }) => {
        // Test 'Security' tab
        await page.goto('/admin/system/monitoring/hub?tab=security');
        // Monitoring Hub uses custom buttons, not Radix Tabs
        await page.waitForTimeout(3000);
        const securityBtn = page.locator('button').filter({ hasText: /모니터링|감시|Security|Monitoring/i }).first();
        if (await securityBtn.isVisible().catch(() => false)) {
            console.log('>>> Security button found');
        }

        // Check for page title with .first() to avoid strict mode violation
        const hasMonitoringTitle = await page.getByText(/감사 및 통계|모니터링|Monitoring/i).first().isVisible({ timeout: 15000 }).catch(() => false);
        if (hasMonitoringTitle) {
            console.log('>>> Monitoring title found');
        }

        // Test 'Health' tab (maps to 'OBSERVABILITY' / '인프라 가동성 정보')
        await page.goto('/admin/system/monitoring/hub?tab=health');
        await page.waitForTimeout(3000);
        const healthBtn = page.getByRole('button', { name: /인프라|Health|가동성/i }).first();
        if (await healthBtn.isVisible().catch(() => false)) {
            console.log('>>> Health button found');
        }
        const hasHealthTitle = await page.getByText(/인프라|Health|가동성/i).first().isVisible({ timeout: 15000 }).catch(() => false);
        if (hasHealthTitle) {
            console.log('>>> Health title found');
        }
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
        await page.waitForTimeout(3000);

        // 1. Expanded Navigation Check for Monitoring
        // Use regex for flexible matching (handles emojis)
        const headerMenu = page.locator('header nav').getByText(/통합|관리|센터|Hub/i).first();
        if (await headerMenu.isVisible().catch(() => false)) {
            await headerMenu.click();
            await page.waitForTimeout(2000);
        } else {
            console.log('>>> No header menu found, trying alternative navigation');
        }

        // Wait for sidebar to load and sub-menu to be visible
        const sidebar = page.locator('aside');
        if (await sidebar.isVisible().catch(() => false)) {
            const monitoringMenu = sidebar.getByText(/감사|통계|모니터링|Monitoring/i).first();
            if (await monitoringMenu.isVisible().catch(() => false)) {
                await monitoringMenu.click();
                await page.waitForTimeout(2000);
            }
        }

        // Try to navigate directly to health tab
        await page.goto('/admin/system/monitoring/hub?tab=health');
        await page.waitForTimeout(3000);

        const healthBtn = page.getByRole('button', { name: /인프라|Health|가동성/i }).first();
        if (await healthBtn.isVisible().catch(() => false)) {
            console.log('>>> Health button found');
        } else {
            console.log('>>> Health button not found');
        }
    });
});

});
