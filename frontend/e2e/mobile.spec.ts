import { test, expect, devices } from '@playwright/test';

test.use({ ...devices['Pixel 5'] }); // Force mobile device for this spec

test.describe('Mobile Viewport Verification', () => {
    test.beforeEach(async ({ page }) => {
        // Login
        await page.goto('/login');
        await page.fill('#id', 'webmaster');
        await page.fill('#password', '1');
        await page.click('button[type="submit"]');
        await page.waitForURL('/');
    });

    test('dashboard widgets should stack vertically on mobile', async ({ page }) => {
        // Find the main statistics cards container
        // On mobile, it should have grid-cols-1 or similar stacking behavior
        const statsGrid = page.locator('div.grid.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-4').first();
        await expect(statsGrid).toBeVisible();

        // Verify that the child elements are stacked (width should be nearly same as viewport)
        const firstCard = statsGrid.locator('> div').first();
        const box = await firstCard.boundingBox();
        const viewport = page.viewportSize();

        if (box && viewport) {
            // In a single column layout, the card width should occupy most of the viewport width
            expect(box.width).toBeGreaterThan(viewport.width * 0.75);
        }
    });

    test('should have a mobile menu toggle (hamburger)', async ({ page }) => {
        // On desktop, it might be visible or integrated. 
        // On mobile (shadcn Sheet), we expect a menu trigger button.
        const menuTrigger = page.locator('button[aria-label="Open Menu"], button:has(svg.lucide-menu)');
        await expect(menuTrigger.first()).toBeVisible();
    });
});
