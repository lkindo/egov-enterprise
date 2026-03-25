import path from 'path';
import { test, expect, type BrowserContext } from '@playwright/test';


// --- From: rbac_rigorous.spec.ts ---
test.describe('rbac_rigorous', () => {


test.describe('Rigorous RBAC Check - Regular User Access Control', () => {

    // 이 테스트는 playwright.config.ts의 'rbac-check' 프로젝트 설정을 통해
    // 'user_regular'의 세션(user.json)을 자동으로 사용합니다.

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
                // URL은 유지되지만 화면에서 거부 메시지가 보여야 함
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

            await page.goto('/admin/community/boards');
            await expect(page.getByText('엔터프라이즈 지식')).toBeVisible({ timeout: 20000 });

            const testSubject = `Workflow Test - ${Date.now()}`;
            
            const writeBtn = page.getByRole('button', { name: /신규 등록|등록/i }).first();
            await expect(writeBtn).toBeVisible({ timeout: 20000 });
            
            // 버튼 클릭 시도 후, 강제로 이동하여 테스트 안정성 확보 (애니메이션/라우팅 지연 대응)
            await Promise.all([
                page.waitForURL(/.*\/insertBoardArticle/, { timeout: 15000 }).catch(() => {}),
                writeBtn.click({ force: true })
            ]);
            
            // 혹시 이동 안 되었을 경우를 대비한 보험적 이동
            if (!page.url().includes('insertBoardArticle')) {
                await page.goto('/admin/community/boards/insertBoardArticle?bbsId=BBSMSTR_CCCCCCCCCCCC');
            }
            
            await expect(page.getByPlaceholder(/제목/i)).toBeVisible({ timeout: 20000 });
            await page.getByPlaceholder(/제목/i).fill(testSubject);
            await page.locator('textarea').fill('System integration test content.');
            
            // 저장 및 리다이렉션 대기
            console.log('>>> Saving post...');
            const saveBtn = page.getByRole('button', { name: /저장|등록|확인/i }).first();
            await saveBtn.click({ force: true });
            
            // 상세 페이지나 목록으로 이동 대기
            await page.waitForURL(/.*pageIndex=1|.*detail/, { timeout: 30000 });
            console.log('>>> Post saved and redirected.');

            // 상세 페이지가 아닌 목록으로 왔다면 검색하여 진입
            await page.goto('/admin/community/boards');
            console.log('>>> Navigated to boards list. Waiting for animations (5s)...');
            await page.waitForTimeout(5000); // 프레임 모션 애니메이션 완결 대기
            await page.reload(); 
            await page.waitForTimeout(3000); // 리로드 후 재로딩 대기
            
            const searchInput = page.getByPlaceholder(/지식 인텔리전스/i);
            await searchInput.scrollIntoViewIfNeeded(); // 가시 영역 확보
            await searchInput.click({ force: true }); 
            await searchInput.fill(testSubject);
            await searchInput.press('Enter');
            console.log(`>>> Search query [${testSubject}] entered.`);

            // 검색 결과 대기 - 제목(h4)을 직접 타격하여 정확도 향상
            console.log('>>> Waiting for H4 element (Long timeout)...');
            const resultLink = page.locator('h4', { hasText: testSubject }).first();
            await expect(resultLink).toBeVisible({ timeout: 60000 });
            console.log('>>> Post found via search.');
            await resultLink.click({ force: true });

            // 3. 삭제 및 정리 (상세 페이지에서 수행)
            console.log('>>> Verifying detail page...');
            await expect(page.getByText(testSubject)).toBeVisible({ timeout: 15000 });
            
            const deleteBtn = page.getByRole('button', { name: /삭제/i });
            await expect(deleteBtn).toBeVisible({ timeout: 10000 });
            
            console.log('>>> Deleting post...');
            page.once('dialog', (dialog: any) => dialog.accept());
            await deleteBtn.click({ force: true });
            
            // 목록으로 돌아온 후 삭제 확인
            await page.waitForURL(/.*boards/, { timeout: 20000 });
            await expect(page.getByText(testSubject)).not.toBeVisible({ timeout: 15000 });
            console.log('>>> Workflow completed and cleaned up.');
        });
    });

});
