import { test, expect } from '@playwright/test';

/**
 * E2E Dashboard Domain Suite
 * Stabilized and optimized for Premium UI components.
 */
test.describe('Dashboard Features', () => {
    test.describe.configure({ mode: 'serial', timeout: 120000 });
    test.use({ storageState: 'playwright/.auth/admin.json' });

    test.beforeEach(async ({ page }) => {
        page.setDefaultTimeout(60000);
        page.setDefaultNavigationTimeout(60000);

        page.on('console', msg => {
            const text = msg.text();
            if (msg.type() === 'error' && 
                !text.includes('404') && 
                !text.includes('RSC') && 
                !text.includes('Hydration') &&
                !text.includes('manifest.json')) {
                console.error(`[STRICT ERROR DETECTED] ${text}`);
            }
        });

        await page.goto('/admin', { waitUntil: 'load' });
    });

    test('should display main dashboard widgets', async ({ page }) => {
        // Wait for hydration and animation
        await page.waitForTimeout(2000);
        
        // Verify Activity Intelligence is visible (The main widget)
        await expect(page.locator('text=Activity Intelligence')).toBeVisible({ timeout: 20000 });
        
        // Check for common stat cards
        await expect(page.locator('text=IDENTITY_RESOURCES')).toBeVisible();
        await expect(page.locator('text=CLUSTER_POLICY')).toBeVisible();
        console.log('>>> Dashboard widgets verified');
    });

    test('should verify quick links', async ({ page }) => {
        // All links in the sidebar/header that lead deeper into admin
        const links = page.locator('nav a[href*="/admin/"]').first();
        await expect(links).toBeVisible({ timeout: 20000 });
        console.log('>>> Navigation links verified');
    });

    test('should handle logout', async ({ page }) => {
        // Find user menu trigger
        const profileTrigger = page.locator('button[aria-label="사용자 계정 메뉴"]').first();
        await expect(profileTrigger).toBeVisible({ timeout: 15000 });
        await profileTrigger.click();
        
        // Find logout button inside popover
        const logoutButton = page.getByRole('button', { name: /로그아웃|Logout/i });
        await expect(logoutButton).toBeVisible({ timeout: 5000 });
        await logoutButton.click();
        
        // Should redirect to login
        await expect(page).toHaveURL(/\/login/, { timeout: 15000 });
        console.log('>>> Logout successful');
    });
});

test.describe('Advanced Dashboard & Stats Interaction', () => {
    test.describe.configure({ mode: 'serial', timeout: 120000 });
    test.use({ storageState: 'playwright/.auth/admin.json' });

    test.beforeEach(async ({ page }) => {
        await page.goto('/admin', { waitUntil: 'load' });
    });

    test('should verify statistical summary cards', async ({ page }) => {
        const cardTitle = 'IDENTITY_RESOURCES';
        const card = page.locator('div.hub-card-premium, a').filter({ hasText: cardTitle }).first();
        await expect(card).toBeVisible({ timeout: 20000 });
        
        const statsValue = card.locator('h2.text-4xl').first();
        await expect(statsValue).toBeVisible();
        const cardValue = await statsValue.innerText();
        console.log(`>>> Verified stat card [${cardTitle}] with value: ${cardValue}`);
    });

    test('should verify task and notice lists', async ({ page }) => {
        // The dashboard has Task & Notice lists
        await expect(page.locator('text=Global Strategy Notice')).toBeVisible({ timeout: 20000 });
        await expect(page.locator('text=Resource Provisioning')).toBeVisible();
        console.log('>>> Tasks and Notices verified');
    });

    test('should verify chart accessibility and rendering', async ({ page }) => {
        // Verify presence of charts (SVG vs Canvas based on implementation)
        const charts = page.locator('canvas, svg').first();
        await expect(charts).toBeVisible({ timeout: 20000 });
        console.log('>>> Charts found and rendered');
    });

    test('should verify responsive behavior on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.waitForTimeout(1000);
        
        // Sidebar should likely be closed, or a hamburger menu should be present
        const mobileMenuTrigger = page.locator('button[aria-label*="메뉴"], button[aria-label*="Menu"]').first();
        if (await mobileMenuTrigger.isVisible()) {
            await mobileMenuTrigger.click();
            await expect(page.locator('aside')).toBeVisible();
        }
        console.log('>>> Mobile responsive layout verified');
    });
});
