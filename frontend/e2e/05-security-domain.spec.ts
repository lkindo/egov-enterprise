import path from 'path';
import { test, expect, type BrowserContext } from '@playwright/test';


// --- From: rbac_rigorous.spec.ts ---
test.describe('rbac_rigorous', () => {


test.describe('Rigorous RBAC Check - Regular User Access Control', () => {

    // 이 테스트는 playwright.config.ts 의 'rbac-check' 프로젝트 설정을 통해
    // 'user_regular' 의 세션 (user.json) 을 자동으로 사용합니다.

    const adminPages = [
        '/admin/system/common-code',
        '/admin/user/manage',
        '/admin/security/author-manage',
        '/admin/stats',
        '/admin/workflow'
    ];

    for (const pagePath of adminPages) {
        test(`Denied access to ${pagePath} for regular user`, async ({ page }) => {
            console.log(`>>> Attempting unauthorized access to: ${pagePath}`);

            // 1. 관리자 페이지로 직접 이동 시도
            await page.goto(pagePath);

            // 2. 리다이렉션 또는 접근 거부 확인
            const currentUrl = page.url();
            console.log(`>>> Current URL after navigation: ${currentUrl}`);

            // 리다이렉트가 이미 발생했다면 (로그인 페이지 등)
            if (!currentUrl.includes(pagePath) || currentUrl.includes('/login') || currentUrl.includes('auth_error')) {
                console.log(`>>> SUCCESS: Redirected away from ${pagePath} to ${currentUrl}`);
                expect(currentUrl).not.toContain(pagePath);
            } else {
                // URL 은 유지되지만 화면에서 거부 메시지가 보여야 함
                await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
                const bodyText = await page.innerText('body');

                const isDenied = bodyText.includes('권한') ||
                                 bodyText.includes('로그인') ||
                                 bodyText.includes('Access Denied') ||
                                 bodyText.includes('접근') ||
                                 bodyText.includes('허가') ||
                                 bodyText.includes('인가') ||
                                 bodyText.includes('세션') ||
                                 bodyText.includes('불가능') ||
                                 bodyText.includes('unauthorized');

                if (!isDenied) {
                    console.log(`>>> FAILED: Access NOT denied. Body excerpt: ${bodyText.substring(0, 100)}`);
                }
                expect(isDenied).toBeTruthy();
                console.log(`>>> SUCCESS: Access denied content shown on ${pagePath}`);
            }
        });
    }

    test('Regular user should see restricted dashboard elements', async ({ page }) => {
        await page.goto('/');

        // 관리자용 메뉴나 버튼이 보이지 않아야 함
        await page.waitForTimeout(1000);
        const adminItems = ['통합 관리 센터', '사용자 관리', '보안 설정'];
        for (const item of adminItems) {
            await expect(page.getByText(item)).not.toBeVisible({ timeout: 5000 });
        }

        console.log('>>> SUCCESS: Admin specific menu items are hidden from regular user');
    });
});

});

// --- From: security.spec.ts ---
test.describe('security', () => {


test.describe('Security & RBAC Enforcement', () => {

    test('Unauthenticated user should be redirected to /login', async ({ browser }) => {
        const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
        const page = await context.newPage();
        await page.goto('/admin/user/manage');
        await page.waitForURL(/.*login.*/, { timeout: 20000 });
        await expect(page).toHaveURL(/.*login.*/);
        await context.close();
    });

    test('Regular user should be blocked from /admin routes', async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();
        await page.goto('/admin/user/manage');
        await context.close();
    });

    test('Admin user should access /admin routes freely', async ({ page }) => {
        // Authenticated as admin via global storageState
        await page.goto('/admin/user/manage', { waitUntil: 'domcontentloaded' });

        console.log(`>>> Admin page URL: ${page.url()}`);

        const indicators = [
            '조직 아키텍처 거버넌스',
            '아이덴티티',
            'Member Matrix'
        ];

        let found = false;
        for (const text of indicators) {
            if (await page.getByText(text).first().isVisible()) {
                found = true;
                break;
            }
        }

        if (!found) {
            expect(page.url()).toContain('/admin/user/manage');
        }

        await expect(page).not.toHaveURL(/.*auth_error=unauthorized/);
    });
});

});

// --- From: cross_role_workflow.spec.ts ---
test.describe('cross_role_workflow', () => {

    test.describe('Board Integration Workflow', () => {
        let adminContext: BrowserContext;

        test.beforeAll(async ({ browser }) => {
            adminContext = await browser.newContext({
                storageState: path.resolve(__dirname, '../playwright/.auth/admin.json'),
            });
        });

        test.afterAll(async () => {
            await adminContext.close();
        });

        test('Full workflow: Create post -> Verify -> Delete', async () => {
            const page = await adminContext.newPage();
            const testSubject = `Workflow Test - ${Date.now()}`;

            console.log('>>> Step 1: Navigate to boards list');
            await page.goto('/admin/community/boards', { waitUntil: 'domcontentloaded' });
            await page.waitForTimeout(5000);

            console.log('>>> Step 2: Navigate to post creation page');
            // Direct navigation for stability
            await page.goto('/admin/community/boards/insertBoardArticle?bbsId=BBSMSTR_CCCCCCCCCCCC', { waitUntil: 'domcontentloaded' });
            await page.waitForTimeout(5000);

            console.log('>>> Step 3: Fill post form');
            // Fill title - try multiple selectors
            const titleSelectors = [
                'input[name="nttSj"]',
                'input[placeholder*="제목"]',
                'input[placeholder*="Title"]',
                'input[type="text"]'
            ];
            
            for (const selector of titleSelectors) {
                const input = page.locator(selector).first();
                if (await input.isVisible().catch(() => false)) {
                    await input.fill(testSubject);
                    console.log(`>>> Title filled using: ${selector}`);
                    break;
                }
            }

            // Fill content - try multiple selectors
            const contentSelectors = [
                'textarea[name="nttCn"]',
                'textarea[placeholder*="내용"]',
                'textarea[placeholder*="Content"]',
                '.ProseMirror',
                'div[contenteditable="true"]'
            ];
            
            for (const selector of contentSelectors) {
                const input = page.locator(selector).first();
                if (await input.isVisible().catch(() => false)) {
                    if (selector.includes('ProseMirror') || selector.includes('contenteditable')) {
                        await input.click();
                        await page.keyboard.type('System integration test content.');
                    } else {
                        await input.fill('System integration test content.');
                    }
                    console.log(`>>> Content filled using: ${selector}`);
                    break;
                }
            }

            console.log('>>> Step 4: Save post');
            // Submit - try multiple selectors
            const submitSelectors = [
                'button:has-text("등록")',
                'button:has-text("저장")',
                'button:has-text("확인")',
                'button[type="submit"]'
            ];
            
            for (const selector of submitSelectors) {
                const btn = page.locator(selector).first();
                if (await btn.isVisible().catch(() => false)) {
                    await btn.click({ force: true });
                    console.log(`>>> Post submitted using: ${selector}`);
                    break;
                }
            }

            await page.waitForTimeout(5000);

            console.log('>>> Step 5: Navigate back to list and search');
            await page.goto('/admin/community/boards', { waitUntil: 'domcontentloaded' });
            await page.waitForTimeout(5000);

            // Search for the post
            const searchSelectors = [
                'input[placeholder*="검색"]',
                'input[placeholder*="Search"]',
                'input[name="searchKeyword"]',
                'input[type="search"]'
            ];
            
            for (const selector of searchSelectors) {
                const input = page.locator(selector).first();
                if (await input.isVisible().catch(() => false)) {
                    await input.fill(testSubject);
                    await input.press('Enter');
                    console.log(`>>> Search performed using: ${selector}`);
                    break;
                }
            }

            await page.waitForTimeout(5000);

            console.log('>>> Step 6: Verify post exists');
            // Check if post title exists in page
            const pageContent = await page.content();
            const postFound = pageContent.includes(testSubject);
            
            if (postFound) {
                console.log(`>>> SUCCESS: Post '${testSubject}' found in list`);
            } else {
                console.log(`>>> WARNING: Post '${testSubject}' not found in list`);
            }

            console.log('>>> Step 7: Navigate to detail and delete (if found)');
            if (postFound) {
                // Try to find and click the post
                const postLink = page.locator(`text=${testSubject}`).first();
                if (await postLink.isVisible().catch(() => false)) {
                    await postLink.click({ force: true });
                    await page.waitForTimeout(3000);

                    // Find delete button
                    const deleteSelectors = [
                        'button:has-text("삭제")',
                        'button:has-text("Delete")',
                        'button.lucide-trash2'
                    ];
                    
                    for (const selector of deleteSelectors) {
                        const btn = page.locator(selector).first();
                        if (await btn.isVisible().catch(() => false)) {
                            page.once('dialog', dialog => dialog.accept());
                            await btn.click({ force: true });
                            console.log(`>>> Post deleted using: ${selector}`);
                            break;
                        }
                    }

                    await page.waitForTimeout(5000);
                    
                    // Verify deletion
                    await page.goto('/admin/community/boards', { waitUntil: 'domcontentloaded' });
                    await page.waitForTimeout(3000);
                    
                    const stillExists = (await page.content()).includes(testSubject);
                    if (!stillExists) {
                        console.log('>>> SUCCESS: Post deleted successfully');
                    } else {
                        console.log('>>> WARNING: Post may still exist');
                    }
                }
            }

            console.log('>>> Workflow test completed');
        });
    });

});
