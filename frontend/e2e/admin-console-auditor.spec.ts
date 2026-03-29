import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Admin Console Auditor
 * 
 * This automated script traverses all administrative menus, clicks through functional nodes,
 * and monitors the browser console for errors, warnings, and network failures.
 */

test.describe('Admin Console Auditor - High-Fidelity Infrastructure Sweep', () => {
    // Use the pre-authenticated admin state
    test.use({ storageState: 'playwright/.auth/admin.json' });

    const errorLogs: string[] = [];
    const screenshotDir = path.resolve(__dirname, '../test-results/auditor-screenshots');

    test.beforeAll(async () => {
        if (!fs.existsSync(screenshotDir)) {
            fs.mkdirSync(screenshotDir, { recursive: true });
        }
    });

    test('Automated Menu Traversal and Console Verification', async ({ page }) => {
        // Increase timeout for this heavy test
        test.setTimeout(300000); // 5 minutes 

        // 1. Setup Listeners (Consolidated for all visits)
        page.on('console', msg => {
            if (msg.type() === 'error' || msg.type() === 'warning') {
                const log = `[CONSOLE ${msg.type().toUpperCase()}] at ${page.url()}: ${msg.text()}`;
                errorLogs.push(log);
            }
        });

        page.on('pageerror', err => {
            const log = `[RUNTIME ERROR] at ${page.url()}: ${err.message}\n${err.stack}`;
            errorLogs.push(log);
        });

        page.on('requestfailed', request => {
            if (request.url().includes('localhost:3001') || request.url().includes('localhost:8080')) {
                const log = `[NETWORK FAILED] ${request.method()} ${request.url()} - ${request.failure()?.errorText}`;
                errorLogs.push(log);
            }
        });

        const visited = new Set<string>();
        const queue: string[] = ['/admin'];

        console.log('>>> Starting Deep Auditor Crawler (Recursive Sweep)');

        // Bypass onboarding once at the start
        await page.goto('http://127.0.0.1:3001/admin', { waitUntil: 'load' });
        await page.evaluate(() => window.localStorage.setItem('egov_smart_tour_v1', 'true'));
        await page.waitForTimeout(1000);

        // 2. Main Crawl Loop
        while (queue.length > 0) {
            const url = queue.shift()!;
            if (visited.has(url)) continue;
            visited.add(url);

            const absoluteUrl = url.startsWith('http') ? url : `http://127.0.0.1:3001${url}`;
            const routeName = new URL(absoluteUrl).pathname.replace(/\//g, '_') || 'dashboard';

            console.log(`\n--- Auditing Route [${visited.size}]: ${absoluteUrl} ---`);

            try {
                await page.goto(absoluteUrl, { waitUntil: 'load', timeout: 30000 });
                
                // For Dashboard or Navigation-heavy pages, expand everything to find more links
                await page.waitForTimeout(2000);

                // Expand Sidebar Buttons (Accordions/Tabs)
                const sidebarButtons = page.locator('nav button, .sidebar button, aside button, [role="tab"]');
                const btnCount = await sidebarButtons.count();
                for (let i = 0; i < Math.min(btnCount, 15); i++) { // Limit to avoid endless clicking
                    try {
                        const btn = sidebarButtons.nth(i);
                        if (await btn.isVisible()) {
                            await btn.click({ force: true, timeout: 1000 }).catch(() => null);
                            await page.waitForTimeout(300);
                        }
                    } catch (e) {}
                }

                // Extract New Links
                const discoveredLinks = await page.evaluate(() => {
                    const anchors = Array.from(document.querySelectorAll('nav a, .sidebar a, [role="navigation"] a, main a, article a, [role="tablist"] a'));
                    return anchors
                        .map(a => (a as HTMLAnchorElement).href)
                        .filter(href => href.includes('/admin/'))
                        .filter(href => !href.includes('/admin/audit')) // Skip logs themselves
                        .filter(href => !href.includes('#')) // Skip anchors
                        .filter((href, index, self) => self.indexOf(href) === index);
                });

                // Add to queue if not visited
                for (const link of discoveredLinks) {
                    const normalizedLink = new URL(link).origin + new URL(link).pathname + new URL(link).search;
                    if (!visited.has(normalizedLink) && !queue.includes(normalizedLink)) {
                        queue.push(normalizedLink);
                    }
                }

                console.log(`    Discovered ${discoveredLinks.length} total links. Current Queue size: ${queue.length}`);

                // Check for UI errors
                const uiErrorDetected = await page.evaluate(() => {
                    const body = document.body.innerText.toLowerCase();
                    return body.includes('error') || body.includes('실패') || body.includes('exception') || body.includes('오류');
                });

                // Captures screenshot if console/network error or UI error
                if (errorLogs.some(l => l.includes(page.url())) || uiErrorDetected) {
                    const screenshotPath = path.join(screenshotDir, `${routeName}_${Date.now()}.png`);
                    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => null);
                    console.log(`    [!] Issues detected at ${page.url()}. Screenshot saved.`);
                }

            } catch (error: any) {
                console.error(`    >>> FAILED to audit ${absoluteUrl}: ${error.message}`);
                errorLogs.push(`[NAVIGATION FAILED] ${absoluteUrl}: ${error.message}`);
            }

            // Safety limit to avoid infinite crawl (e.g. 50 pages)
            if (visited.size > 50) {
                console.warn('>>> Safety limit (50 pages) reached. Ending crawl.');
                break;
            }
        }

        // 5. Final Report
        console.log('\n================================================');
        console.log('   ADMIN CONSOLE AUDITOR FINAL REPORT');
        console.log('================================================');
        console.log(`Total Unique Routes Audited: ${visited.size}`);
        console.log(`Total Issues Detected: ${errorLogs.length}`);
        
        if (errorLogs.length > 0) {
            console.log('\n--- DETAILED ISSUE LIST ---');
            // Remove duplicates for cleaner report
            const uniqueIssues = [...new Set(errorLogs)];
            uniqueIssues.forEach((log, i) => console.log(`${i + 1}. ${log}`));
        } else {
            console.log('\n>>> SUCCESS: No console errors, runtime crashes, or network failures detected across entire suite.');
        }
    });
});
