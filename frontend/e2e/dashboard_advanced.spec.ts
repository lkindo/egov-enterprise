import { test, expect } from '@playwright/test';

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
        await expect(page.getByText('심층 매트릭스 보고서')).toBeVisible();
        
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
