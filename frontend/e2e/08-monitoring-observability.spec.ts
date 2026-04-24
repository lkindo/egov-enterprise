import { test, expect } from '@playwright/test';

/**
 * Monitoring & Observability E2E Test
 * Validates real-time metrics, health indicators, and audit log integration.
 */
test.describe('Monitoring & Observability Domain', () => {
    // Use pre-authenticated admin state
    test.use({ 
        storageState: 'playwright/.auth/admin.json',
        viewport: { width: 1920, height: 1080 }
    });

    test.beforeEach(async ({ page }) => {
        // Increase timeout for complex visualization components
        page.setDefaultTimeout(60000);
        
        page.on('console', msg => console.log(`[BROWSER] ${msg.type()}: ${msg.text()}`));
        page.on('pageerror', err => console.error(`[BROWSER ERROR] ${err.message}`));
        
        console.log(`>>> Navigating to /admin/system/monitoring...`);
        await page.goto('/admin/system/monitoring', { waitUntil: 'load' });
        
        // Wait for hydration and potential animation
        await page.waitForTimeout(5000);
    });

    test('should display monitoring hub main interface', async ({ page }) => {
        console.log(`>>> Current URL: ${page.url()}`);
        
        // Verify Title
        const title = page.locator('h1');
        await expect(title).toBeVisible({ timeout: 30000 });
        const titleText = await title.innerText();
        console.log(`>>> H1 Title Text: ${titleText}`);
        expect(titleText).toContain('시스템 인텔리전스 거버넌스');
        
        // Verify Tabs in the sidebar (Korean labels)
        await expect(page.locator('button:has-text("보안 감사 매트릭스")')).toBeVisible();
        await expect(page.locator('button:has-text("시스템 로그 엔진")')).toBeVisible();
        await expect(page.locator('button:has-text("인증 접속 히스토리")')).toBeVisible();
        await expect(page.locator('button:has-text("인프라 가동성 정보")')).toBeVisible();
        await expect(page.locator('button:has-text("인프라 토폴로지 맵")')).toBeVisible();
        
        console.log('>>> Monitoring Hub main interface verified');
    });

    test('should verify real-time observability metrics and gauges', async ({ page }) => {
        // Switch to "인프라 가동성 정보" (OBSERVABILITY) tab
        const obsTab = page.locator('button:has-text("인프라 가동성 정보")');
        await obsTab.click();
        
        // Wait for dynamic charts to load
        await page.waitForTimeout(3000);

        // 1. Verify CPU and Memory Gauge Charts
        await expect(page.locator('text=CPU_LOAD')).toBeVisible({ timeout: 30000 });
        await expect(page.locator('text=MEMORY_ALLOC')).toBeVisible();
        
        // 2. Verify Health Status Indicators
        await expect(page.locator('text=API Microservices')).toBeVisible();
        await expect(page.locator('text=PostgreSQL Cluster')).toBeVisible();
        
        console.log('>>> Observability metrics and gauges verified');
    });

    test('should verify audit log data table functionality', async ({ page }) => {
        // Switch to "보안 감사 매트릭스" (SECURITY) tab
        await page.locator('button:has-text("보안 감사 매트릭스")').click();
        await page.waitForTimeout(2000);
        
        // Verify table headers / data stream title
        await expect(page.locator('text=인베스티게이션')).toBeVisible({ timeout: 20000 });
        
        console.log('>>> Audit log table functionality verified');
    });

    test('should verify system topology map rendering', async ({ page }) => {
        // Switch to "인프라 토폴로지 맵" (TOPOLOGY) tab
        await page.locator('button:has-text("인프라 토폴로지 맵")').click();
        
        // Topology map uses next/dynamic with ssr: false, wait for hydration
        await page.waitForTimeout(5000);
        
        // The topology renders as a card list (not canvas/svg).
        // Wait for topology tab content to load - check for any topology node text
        // Using count-based check to avoid strict mode violation (multiple matches allowed).
        let topologyRendered = false;
        const deadline = Date.now() + 30000;
        while (Date.now() < deadline) {
            const count = await page.locator('text=Sentinel Topology Stream').count();
            if (count > 0) {
                topologyRendered = true;
                break;
            }
            const nodeCount = await page.locator('text=Cloud Front / LB').count();
            if (nodeCount > 0) {
                topologyRendered = true;
                break;
            }
            await page.waitForTimeout(500);
        }
        expect(topologyRendered, 'Topology map should render at least one node or label').toBe(true);
        
        console.log('>>> System topology map rendering verified');
    });
});
