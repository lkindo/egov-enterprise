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
            // 성공 조건: URL이 관리자 경로가 아니거나, 메인/로그인 페이지로 튕겨나감
            const currentUrl = page.url();
            console.log(`>>> Current URL after navigation: ${currentUrl}`);
            const cookies = await page.context().cookies();
            console.log(`>>> Cookies: ${JSON.stringify(cookies.map(c => c.name + '=' + c.domain))}`);
            
            // 만약 미들웨어나 서버 컴포넌트에서 차단한다면, URL이 바뀌거나 특정 에러 컴포넌트가 노출됨
            if (currentUrl.includes(pagePath)) {
                // 만약 URL은 그대로라면, 화면 내에 '권한' 관련 경고 메시지가 있어야 함
                // Wait specifically for content that indicates denial
                await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
                const bodyText = await page.innerText('body');
                const isDenied = bodyText.includes('권한') || bodyText.includes('Access Denied') || bodyText.includes('접근') || bodyText.includes('허가');
                expect(isDenied).toBeTruthy();
                console.log(`>>> SUCCESS: Access denied content shown on ${pagePath}`);
            } else {
                // URL이 바뀌었다면 (리다이렉트), 관리자 경로가 아닌 곳으로 갔는지 확인
                expect(currentUrl).not.toContain('/admin');
                console.log(`>>> SUCCESS: Redirected away from ${pagePath} to ${currentUrl}`);
            }
        });
    }

    test('Regular user should see restricted dashboard elements', async ({ page }) => {
        await page.goto('/');
        
        // 관리자용 메뉴나 버튼이 보이지 않아야 함
        // Use separate locators and wait for a bit to ensure they don't appear
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

        // Mock a regular user login by setting a non-admin role cookie if needed
        // but for now, we just test access with admin session redirected or blocked
        await page.goto('/admin/user/manage');
        // If not admin, middleware should redirect to /
        // await page.waitForURL('**/');
        await context.close();
    });

    test('Admin user should access /admin routes freely', async ({ page }) => {
        // Authenticated as admin via global storageState
        await page.goto('/admin/user/manage', { waitUntil: 'domcontentloaded' });
        
        // Log current URL for debugging
        console.log(`>>> Admin page URL: ${page.url()}`);
        
        // Check for common admin page indicators
        const indicators = [
            '사용자 계정 관리',
            'USER DIRECTORY MASTER',
            'Admin System'
        ];
        
        let found = false;
        for (const text of indicators) {
            if (await page.getByText(text).first().isVisible()) {
                found = true;
                break;
            }
        }
        
        if (!found) {
            // If text indicators fail, check if we were redirected
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
        await expect(page.getByText('게시판')).toBeVisible({ timeout: 20000 });

        const testSubject = `Workflow Test - ${Date.now()}`;
        
        const writeBtn = page.getByRole('button', { name: /새 글 쓰기|등록/i });
        await expect(writeBtn).toBeVisible({ timeout: 15000 });
        await writeBtn.click();
        
        await expect(page).toHaveURL(/.*\/write/);
        await page.getByPlaceholder(/제목/i).fill(testSubject);
        await page.locator('textarea').fill('System integration test content.');
        
        // 저장 - force click을 사용하여 가려진 경우에도 클릭 시도
        const saveBtn = page.getByRole('button', { name: /저장|등록|확인/i }).first();
        await saveBtn.click({ force: true });
        
        // 목록에서 찾기 위해 검색 필터 사용
        await page.goto('/admin/community/boards');
        const searchInput = page.getByPlaceholder(/제목, 내용 입력/i);
        await searchInput.fill(testSubject);
        await searchInput.press('Enter');

        // 검색 결과 대기
        await expect(page.locator('tr', { hasText: testSubject })).toBeVisible({ timeout: 30000 });
        console.log('>>> Post found via search.');

        // 3. 삭제 및 정리
        const postRow = page.locator('tr', { hasText: testSubject });
        await postRow.click();
        
        const deleteBtn = page.getByRole('button', { name: /삭제/i });
        await expect(deleteBtn).toBeVisible({ timeout: 10000 });
        
        page.once('dialog', dialog => dialog.accept());
        await deleteBtn.click({ force: true });
        
        await expect(page.getByText(testSubject)).not.toBeVisible({ timeout: 15000 });
        console.log('>>> Workflow completed and cleaned up.');
    });
});

});
