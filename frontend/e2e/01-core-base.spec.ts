import { test, expect } from './fixtures/base-test';
import AxeBuilder from '@axe-core/playwright';

/**
 * [Tier 1] Core Base: Authentication & Dashboard Hub
 * 
 * 이 테스트는 시스템의 가장 기본적인 기동성을 확인합니다.
 * 1. 로그인/로그아웃 흐름
 * 2. 대시보드 위젯 및 차트 렌더링
 * 3. 전역 레이아웃(사이드바, 헤더) 무결성
 */

test.describe('Tier 1: Core Base (Auth & Dashboard)', () => {

    // [2026-08-10 중복제거] 삭제됨: 'User Authentication Flow (UI based)'.
    //   23-security-auth-supplement 의 E0 가 **같은 UI 로그인 경로의 상위집합**이다 —
    //   폼 입력·제출·`/admin` 착지까지 동일하게 하고, 거기에 더해
    //     · Route Handler(`/api/auth/login`) 가 실제로 200 을 돌려주는지 응답을 직접 관측하고
    //       (이중 프리픽스 회귀 `'/api/v1/api/auth/login'` 를 정면으로 잡는다)
    //     · accessToken 이 **HttpOnly** 쿠키로 심겼는지까지 단언한다.
    //   이 테스트가 고유하게 보던 '로그인 후 전자정부 5.0 배지'는 아래
    //   'Widgets and Charts Rendering' 이 저장된 세션으로 이미 검증한다.

    test('Accessibility Audit for Login Page', async ({ page, consoleGuard }) => {
        // 비로그인 상태의 로그인 화면은 AuthContext 가 세션 유무를 확인하며 401 을 받는다.
        // 이 테스트의 계약은 접근성이고 401 은 화면 진입의 정상 부산물이다.
        consoleGuard.expectErrors([{
            id: 'E2E-CORE-LOGIN-A11Y-ME-401',
            specScope: '01-core-base.spec.ts :: Accessibility Audit for Login Page',
            channel: 'response',
            urlPattern: /\/api\/v1\/auth\/me(?:\?|$)/,
            messagePattern: null,
            method: 'GET',
            status: 401,
            maxOccurrences: 4,
            reason: '비로그인 상태의 로그인 화면이 세션 유무를 확인하는 초기 요청이다.',
            expiresAt: '2026-12-31',
        }]);
        await page.goto('/login?e2e=true');
        const a11y = await new AxeBuilder({ page }).disableRules(['color-contrast']).analyze(); // color-contrast: CI 테마 가변성 방어
        expect(a11y.violations, JSON.stringify(a11y.violations.map((v) => v.id))).toEqual([]);
    });

    test.describe('Dashboard Integrity (Session Preserved)', () => {
        test.use({ storageState: 'playwright/.auth/admin.json' });

        test.beforeEach(async ({ page }) => {
            await page.goto('/admin');
        });

        test('Widgets and Charts Rendering', async ({ page }) => {
            console.log('>>> Step 1: Verifying Stat Cards');
            await expect(page.locator('text=ID 레지스트리').first()).toBeVisible();
            await expect(page.locator('text=보안 거버넌스').first()).toBeVisible();

            console.log('>>> Step 2: Verifying Audit Intelligence Widget');
            // [2026-07-27 정정] 종전에는 `.recharts-surface` 를 기다렸으나 **대시보드에는 recharts 가 없다**.
            // 저장소 전수 확인 결과 recharts 사용처는 admin/stats/IntelligenceHubClient 하나뿐이며,
            // 차트 렌더 검증은 그 페이지의 스펙이 담당한다. 대시보드가 실제로 렌더하는 것은
            // 감사 인텔리전스 타임라인 위젯이므로 그것을 단언한다.
            await expect(page.getByRole('heading', { name: '최근 보안 감사 이력' })).toBeVisible({ timeout: 15000 });

            console.log('>>> Step 3: Verifying Stat Card Set');
            // [2026-07-27 정정] '활동 인텔리전스' 는 **코드베이스 어디에도 없는 문구**였다(UI 개편 잔재).
            // 실재하는 통계 카드 제목으로 교체한다.
            await expect(page.locator('text=보안 감사 이력').first()).toBeVisible();
        });

        test('Accessibility Audit for Admin Dashboard', async ({ page }) => {
            // [2026-07-27] 렌더 완료를 먼저 기다린다. 종전에는 최외곽 Suspense 폴백("보안 세션을 확인하는 중...")
            // 상태에서 감사가 돌아 **스피너를 검사**했고, 그래서 landmark/heading 위반이 나왔다(감사 대상 오인).
            // 페이지 제목(h1)이 뜨면 레이아웃·본문이 모두 렌더된 상태다.
            await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 30000 });
            const a11y = await new AxeBuilder({ page }).disableRules(['color-contrast']).analyze(); // color-contrast: CI 테마 가변성 방어
            expect(a11y.violations, JSON.stringify(a11y.violations.map((v) => v.id))).toEqual([]);
        });

        test('Global Layout & Navigation Mapping', async ({ page }) => {
            console.log('>>> Step 1: Sidebar Visibility');
            const sidebar = page.locator('aside').first();
            await expect(sidebar).toBeVisible();

            console.log('>>> Step 2: Sidebar Menu Interaction');
            const menuTrigger = page.locator('nav a[href*="/admin/"]').first();
            await expect(menuTrigger).toBeVisible();
            
            // [E2E 감사 B] 조건부 breadcrumb 단언 제거 — /admin 루트에서 breadcrumb는 선택적이라
            // if(isVisible) 가드가 항상 스킵되던 false-green 스텝이었음. 위 사이드바/네비 단언으로 레이아웃 무결성 검증.
        });

        // [2026-08-10 강화] 제목이 'Session Cleanup' 인데 **정리를 검증하지 않았다** — 리다이렉트만 봤다.
        //   그런데 로그아웃의 보안적 핵심은 "화면이 바뀌는가"가 아니라 **세션이 실제로 죽는가**다.
        //   /api/auth/logout 라우트는 accessToken·session_exp 를 만료시키고 백엔드 Set-Cookie 를
        //   포워딩하는데(logout/route.ts), 그 만료가 누락돼도 종전 단언은 전부 그린이었다:
        //   리다이렉트는 클라이언트가 수행하므로 쿠키가 남아 있어도 /login 으로 간다.
        //   → 쿠키 소멸과 '보호 경로 재진입 차단'까지 확인해 제목이 약속한 것을 실제로 검증한다.
        // [2026-08-19] 여기에 /auth/me 401 ledger 항목을 달았다가 되돌렸다. CI 실측
        //   (run 32246769332)에서 `[EXPECTED ERROR 미발생]`으로 red 가 났다 — 로그아웃 라우트가
        //   쿠키를 지우고 클라이언트가 /login 으로 이동하는 이 경로에서는 그 요청이 나가지 않는다.
        //   ledger 는 미발생도 위반으로 보므로, 발생하지 않는 오류를 '예상'으로 등록하면 안 된다.
        test('Logout Redirection and Session Cleanup', async ({ page, context }) => {
            console.log('>>> Step 1: Triggering User Menu');
            const profileTrigger = page.locator('button[aria-label="사용자 계정 메뉴"]').first();
            await expect(profileTrigger).toBeVisible({ timeout: 15000 });
            await profileTrigger.click();

            console.log('>>> Step 2: Logout Action');
            const logoutButton = page.getByRole('button', { name: /로그아웃|Logout/i });
            await expect(logoutButton).toBeVisible();
            await logoutButton.click();

            console.log('>>> Step 3: Redirection Check');
            await expect(page).toHaveURL(/\/login/, { timeout: 15000 });

            console.log('>>> Step 4: 세션 쿠키가 실제로 소멸했는지');
            // 쿠키는 응답 처리 순서상 리다이렉트 직후 잠깐 남아 있을 수 있으므로 수렴을 기다린다.
            await expect
                .poll(async () => {
                    const cookies = await context.cookies();
                    return cookies.find((c) => c.name === 'accessToken')?.value ?? '';
                }, { timeout: 10000, message: '로그아웃 후에도 accessToken 쿠키가 살아 있다' })
                .toBe('');

            console.log('>>> Step 5: 보호 경로 재진입이 차단되는지 (뒤로가기·URL 직접입력 재사용 방어)');
            // 쿠키가 지워졌다면 미들웨어가 유효 토큰을 찾지 못해 /login 으로 되돌려야 한다.
            await page.goto('/admin/work-hub');
            await expect(page, '로그아웃 뒤에도 보호 경로에 진입할 수 있다 — 세션이 살아 있다')
                .toHaveURL(/\/login/, { timeout: 15000 });
        });
    });

    test.describe('User Portal Integrity (Session Preserved)', () => {
        test.use({ storageState: 'playwright/.auth/user.json' });

        test.beforeEach(async ({ page }) => {
            console.log('>>> Navigating to User Portal Home');
            await page.goto('/');
        });

        test('User Unified Dashboard Rendering', async ({ page }) => {
            console.log('>>> Step 1: Verifying User Layout & Global Navigation');
            const header = page.locator('header').first();
            await expect(header).toBeVisible();
            
            console.log('>>> Step 2: Verifying Main User Elements');
            // User Portal 특정 대시보드 또는 위젯 텍스트 확인 (일반적으로 나타나는 요소)
            await expect(page.locator('text=전자정부').first()).toBeVisible();
        });
        
        test('User Profile and Logout', async ({ page }) => {
            // [E2E 감사 B] isVisible 가드 제거 — 프로필 버튼이 없으면 실패시키고, 제목이 약속한 '로그아웃'을 실제 수행한다.
            // (과거: 유일한 expect가 가드 안에 있어 버튼 부재 시 무단언 통과, 존재 시 가드 조건과 동일한 tautology였음)
            console.log('>>> Step 1: Opening User Account Menu');
            // 공유 헤더(header.tsx)의 계정 버튼 aria-label — 관리자 로그아웃 테스트와 동일 셀렉터로 정합.
            const profileButton = page.locator('button[aria-label="사용자 계정 메뉴"]').first();
            await expect(profileButton).toBeVisible({ timeout: 15000 });
            await profileButton.click();

            console.log('>>> Step 2: Logout Action');
            const logoutButton = page.getByRole('button', { name: /로그아웃|Logout/i }).first();
            await expect(logoutButton).toBeVisible({ timeout: 10000 });
            await logoutButton.click();

            console.log('>>> Step 3: Redirect to Login');
            await expect(page).toHaveURL(/\/login/, { timeout: 15000 });
        });
    });
});
