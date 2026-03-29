import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Admin Console Auditor - Robust URL Direct Visit Sweep
 * 
 * This automated script visits each administrative route directly, 
 * monitoring for runtime exceptions, console errors, and network failures.
 */

// Target admin routes discovered from the project structure
const ADMIN_ROUTES = [
    '/admin/community/boards',
    '/admin/help/faq',
    '/admin/help/qna',
    '/admin/operation/events',
    '/admin/operation/external-hr',
    '/admin/operation/memo-reports',
    '/admin/operation/rewards',
    '/admin/operation/rough-map',
    '/admin/sanctn/forms',
    '/admin/sanctn/workflow',
    '/admin/security/audit',
    '/admin/security/authority',
    '/admin/security/dept-authority',
    '/admin/security/group',
    '/admin/security/role',
    '/admin/stats/board',
    '/admin/stats/data-usage',
    '/admin/stats/report',
    '/admin/stats/screen',
    '/admin/stats/user',
    '/admin/survey/hub',
    '/admin/survey/items',
    '/admin/survey/manage',
    '/admin/survey/polls',
    '/admin/survey/questions',
    '/admin/survey/respondents',
    '/admin/survey/stats',
    '/admin/survey/templates',
    '/admin/system/audit',
    '/admin/system/banner',
    '/admin/system/codes',
    '/admin/system/comments',
    '/admin/system/common-code',
    '/admin/system/files',
    '/admin/system/ism',
    '/admin/system/layout',
    '/admin/system/logs',
    '/admin/system/menus',
    '/admin/system/monitoring',
    '/admin/system/network',
    '/admin/system/policies',
    '/admin/system/programs',
    '/admin/user/absences',
    '/admin/user/departments',
    '/admin/user/indvdl-info-policy',
    '/admin/user/login-policy',
    '/admin/user/manage',
    '/admin/uss/ion/sms',
    '/admin/uss/olh/online-manual',
    '/admin/workspace/mypage'
];

test.describe('Admin Console Auditor - Parallel Sweep', () => {
    // Use the pre-authenticated admin state
    test.use({ storageState: 'playwright/.auth/admin.json' });

    const screenshotDir = path.resolve(__dirname, '../test-results/auditor-screenshots');

    test.beforeAll(async () => {
        if (!fs.existsSync(screenshotDir)) {
            fs.mkdirSync(screenshotDir, { recursive: true });
        }
    });

    for (const route of ADMIN_ROUTES) {
        test(`Audit Route: ${route}`, async ({ page }) => {
            // Set timeout for individual route audit
            test.setTimeout(60000); 

            const errorLogs: string[] = [];
            const routeSlug = route.replace(/\//g, '_');
            const baseUrl = 'http://localhost:3001';
            const fullUrl = `${baseUrl}${route}`;

            // 1. Setup Listeners for this specific test
            page.on('console', msg => {
                if (msg.type() === 'error') {
                    errorLogs.push(`[CONSOLE ERROR] ${msg.text()}`);
                }
            });

            page.on('pageerror', err => {
                errorLogs.push(`[RUNTIME ERROR] ${err.message}`);
            });

            page.on('requestfailed', request => {
                const url = request.url();
                if (url.includes('localhost') || url.includes('127.0.0.1')) {
                    errorLogs.push(`[NETWORK FAILED] ${request.method()} ${url} - ${request.failure()?.errorText}`);
                }
            });

            page.on('response', async response => {
                const url = response.url();
                if ((url.includes('localhost') || url.includes('127.0.0.1')) && response.status() >= 400) {
                    try {
                        const body = await response.text();
                        const errorMsg = `[API Failure] [${response.status()}] ${response.url()}: ${body.substring(0, 200)}${body.length > 200 ? '...' : ''}`;
                        errorLogs.push(errorMsg);
                    } catch (e) {
                        errorLogs.push(`[API Failure] [${response.status()}] ${response.url()} (Body unreadable)`);
                    }
                }
            });

            // 2. Perform Onboarding Bypass (if needed per page, but once is usually enough for session)
            // Note: Since we use storageState, we should be fine, but some apps reset local storage.
            // We'll do it once at the start of each test for absolute safety in parallel environment.
            await page.goto(baseUrl + '/admin', { waitUntil: 'domcontentloaded' });
            await page.evaluate(() => window.localStorage.setItem('egov_smart_tour_v1', 'true'));

            // 3. Visit Target Route
            console.log(`Auditing: ${route}`);
            const response = await page.goto(fullUrl, { waitUntil: 'networkidle', timeout: 45000 });
            
            // Allow small buffer for final rendering
            await page.waitForTimeout(2000);

            // 4. Check status and logs
            const status = response?.status() || 0;
            const is500 = status >= 500;
            
            if (is500 || errorLogs.length > 0) {
                const screenshotPath = path.join(screenshotDir, `fail${routeSlug}_${Date.now()}.png`);
                await page.screenshot({ path: screenshotPath, fullPage: true });
                
                const combinedMsg = [
                    `Route ${route} failed with status ${status}`,
                    ...errorLogs
                ].join('\n    ');
                
                throw new Error(combinedMsg);
            }

            console.log(`    [✓] ${route} passed.`);
        });
    }
});


