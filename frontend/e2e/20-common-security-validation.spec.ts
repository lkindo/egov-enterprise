import { test, expect } from './fixtures/base-test';

test.describe('Tier 20: Common Security & UI Validation', () => {
    test.use({ storageState: 'playwright/.auth/admin.json' });

    test('Session Integrity: Handling Token Clearance', async ({ page, context, consoleGuard }) => {
        // 이 테스트는 토큰을 의도적으로 비워 세션 만료를 시뮬레이션한다 → 그로 인한 401(알림 폴링/토큰 재발급 실패)은
        // '정상적인 만료 처리'의 일부이므로 콘솔 가드에서 무시한다(검증 대상은 로그인 리다이렉트).
        consoleGuard.addIgnorePattern(
            /notifications|auth\/reissue|\/ws(?:\/|$)/i,
        );
        console.log('>>> Step 1: Navigating to a protected admin page');
        await page.goto('/admin/community/boards/master');
        await expect(page).toHaveURL(/.*master/);

        console.log('>>> Step 2: Clearing cookies and localStorage to simulate session expiration');
        await context.clearCookies();
        await page.evaluate(() => localStorage.clear());
        
        console.log('>>> Step 3: Attempting a protected navigation');
        // AuthContext와 middleware가 모두 만료를 감지할 수 있어 보호 경로 탐색은 로그인 탐색에 의해
        // 중단될 수 있다. 리다이렉트를 먼저 관찰하고, 그 두 가지 기대 중단만 허용한다.
        const loginRedirect = page.waitForURL(/\/login(?:\?|$)/, {
            waitUntil: 'domcontentloaded',
            timeout: 15000,
        });
        await Promise.all([
            loginRedirect,
            page.goto('/admin/community/boards/master', { waitUntil: 'domcontentloaded' }).catch((error: unknown) => {
                const message = error instanceof Error ? error.message : String(error);
                if (!/net::ERR_ABORTED|interrupted by another navigation/i.test(message)) throw error;
            }),
        ]);

        await expect(page).toHaveURL(/\/login(?:\?|$)/);
        await expect(page.getByRole('heading', { name: '전자정부 Enterprise 로그인' })).toBeVisible();
        console.log('>>> Correctly redirected to login after session loss');
    });

    // [E2E 감사 Phase3 중복제거] 삭제됨: 'Search with Special Characters (Injection Prevention)' —
    // XSS/인젝션 검증은 22-deep-security-guard가 소유(실 dialog 가드 + 이스케이프 렌더 단언으로 재작성됨).
    // 기존 테스트는 body 가시성(tautology) + if(isVisible) 가드로 무단언 통과하던 false-green이었음.

    // [2026-08-10 개명·축소] 종전 이름은 'Navigation Integrity: Rapid Menu Switching' 이었고
    //   "rapid navigation completed without system deadlock" 을 출력했다. 그러나 각 이동을
    //   `await page.goto()` 로 **완전히 기다렸다 다음으로 넘어가므로 rapid 하지 않고**, 교착을
    //   판정하는 단언도 없었다 — 이름이 검증하지 않는 것을 주장하고 있었다.
    //   경로도 4개 중 3개가 다른 스펙 소유였다:
    //     `/admin/community/boards/master` → 03-board-master·21 / `/admin/system/menus` → 19
    //   유일하게 아무도 보지 않던 `/admin/system/programs` 만 남기고, 이름을 실제 검증(연속 진입
    //   후에도 관리 셸과 페이지 헤딩이 렌더된다)에 맞춘다.
    test('Navigation Integrity: 관리 화면 연속 진입 후에도 셸과 헤딩이 렌더된다', async ({ page }) => {
        const menus = [
            '/admin/system/programs',
            '/admin/system/menus',
        ];

        for (const url of menus) {
            await page.goto(url);
            await expect(page.locator('aside, nav, header').first(), `${url}: 관리 셸이 렌더되지 않음`).toBeVisible();
            await expect(page.locator('h1, h2').first(), `${url}: 페이지 헤딩이 렌더되지 않음`).toBeVisible();
        }
    });
});
