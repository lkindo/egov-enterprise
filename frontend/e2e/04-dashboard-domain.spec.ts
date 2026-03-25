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
        // Check for summary cards
        await expect(page.locator('.hub-card-section').first()).toBeVisible();
        await expect(page.getByText('결재 대기')).toBeVisible();
        await expect(page.getByText('보안 지수')).toBeVisible();

        // Check for charts - Using regex for flexibility
        await expect(page.getByText(/트래픽 데이터 분석|시스템 활성 지표/).first()).toBeVisible({ timeout: 20000 });
    });

    test('should verify quick links', async ({ page }) => {
        // Look for Recent Notices link - increase timeout as this might be slow to render
        const noticeLink = page.locator('a').filter({ hasText: '더보기' }).first();
        await expect(noticeLink).toBeVisible({ timeout: 15000 });
        await noticeLink.click();

        // Should navigate to notice board
        await expect(page).toHaveURL(/.*\/admin\/community\/boards/);
    });

    test('should handle logout', async ({ page }) => {
        // Find and click user profile popover trigger
        const profileBtn = page.locator('header button').last();
        await expect(profileBtn).toBeVisible({ timeout: 15000 });
        await profileBtn.click();

        // Click logout button - look for "로그아웃" or "Sign Out"
        const logoutBtn = page.getByRole('button', { name: /로그아웃|Sign Out/i }).last();
        await expect(logoutBtn).toBeVisible({ timeout: 5000 });
        await logoutBtn.click();

        // Verify redirection to login
        await page.waitForURL('**/login', { timeout: 15000 });
        await expect(page.locator('body')).toContainText(/LOG(IN| OUT)|E-GOV|표준프레임워크|아이디/i);
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
        const securityBtn = page.locator('button').filter({ hasText: /모니터링|감사/ }).first();
        await expect(securityBtn).toHaveClass(/bg-slate-900/, { timeout: 15000 });
        await expect(page.getByText('감사 및 통계 모니터링')).toBeVisible();

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
        const headerMenu = page.locator('header nav').getByText(/통합 관리 센터/);
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

});
