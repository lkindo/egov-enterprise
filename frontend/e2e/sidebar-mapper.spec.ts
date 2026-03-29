import { test } from '@playwright/test';

test.describe('Sidebar Structure Mapper', () => {
    test.use({ storageState: 'playwright/.auth/admin.json' });

    test('Log Sidebar DOM for Crawler Optimization', async ({ page }) => {
        await page.goto('/admin', { waitUntil: 'networkidle' });
        
        // 1. Log all interactive elements in sidebar/nav
        const elements = await page.evaluate(() => {
            const sidebar = document.querySelector('nav, .sidebar, aside');
            if (!sidebar) return 'Sidebar not found';
            
            const interactive = Array.from(sidebar.querySelectorAll('button, a'));
            return interactive.map(el => ({
                tag: el.tagName,
                text: el.textContent?.trim(),
                role: el.getAttribute('role'),
                classes: el.className,
                href: (el as HTMLAnchorElement).href || null
            }));
        });

        console.log('--- SIDEBAR INTERACTIVE ELEMENTS ---');
        console.log(JSON.stringify(elements, null, 2));

        // 2. Try to expand all buttons to see if new links appear
        const buttons = page.locator('nav button, .sidebar button, aside button');
        const count = await buttons.count();
        console.log(`Detected ${count} buttons in sidebar. Attempting expansion...`);
        
        for (let i = 0; i < count; i++) {
            try {
                await buttons.nth(i).click({ force: true, timeout: 2000 });
                await page.waitForTimeout(500);
            } catch (e) {}
        }

        const expandedLinks = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('nav a, .sidebar a, aside a'))
                .map(a => (a as HTMLAnchorElement).href)
                .filter(href => href.includes('/admin/'));
        });

        console.log('--- EXPANDED ADMIN LINKS ---');
        console.log(JSON.stringify([...new Set(expandedLinks)], null, 2));
    });
});
