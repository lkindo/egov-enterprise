import { test, expect } from '@playwright/test';

test('capture-admin-pages', async ({ page }) => {
    // Bypass onboarding tour
    await page.addInitScript(() => {
        window.localStorage.setItem('egov_smart_tour_v1', 'true');
    });
    // Ensure we explicitly load the homepage once
    await page.goto('/', { waitUntil: 'networkidle' });

    console.log("--- User Management ---");
    await page.goto('/admin/user/manage');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'playwright/debug_user_manage_v2.png', fullPage: true });
    
    console.log("\n--- Online Poll ---");
    await page.goto('/admin/survey/polls');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'playwright/debug_poll_manage_v2.png', fullPage: true });
});
