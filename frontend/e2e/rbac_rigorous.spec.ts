import { test, expect } from '@playwright/test';

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
        const adminItems = ['시스템 관리', '사용자 관리', '보안 설정'];
        for (const item of adminItems) {
            await expect(page.getByText(item)).not.toBeVisible({ timeout: 5000 });
        }
        
        console.log('>>> SUCCESS: Admin specific menu items are hidden from regular user');
    });
});
