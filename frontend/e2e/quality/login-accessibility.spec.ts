import AxeBuilder from '@axe-core/playwright';
import { Page } from '@playwright/test';
import { expect,test } from '../fixtures/browser-test';

async function openAnonymousLogin(page: Page, url: string) {
    // SSR heading/font checks can finish before hydration sends the session request.
    // Observe the expected 401 before teardown checks that its ledger was consumed.
    await Promise.all([
        page.waitForResponse(response =>
            new URL(response.url()).pathname === '/api/v1/auth/me'
            && response.request().method() === 'GET'
            && response.status() === 401),
        page.goto(url),
    ]);
}

test.describe('공통 셸과 인증', () => {
    async function stabilizeAccessibilityAudit(page: Page) {
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.addStyleTag({
            content: `
            *, *::before, *::after {
                animation-duration: 0s !important;
                animation-delay: 0s !important;
                transition-duration: 0s !important;
                transition-delay: 0s !important;
            }
        `,
        });
        await page.evaluate(() => new Promise<void>((resolve) => {
            requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        }));
    }
    test.describe('Core Base (Auth & Dashboard)', () => {
        test('Accessibility Audit for Login Page', async ({ page, consoleGuard }) => {
            // 비로그인 상태의 로그인 화면은 AuthContext 가 세션 유무를 확인하며 401 을 받는다.
            // 이 테스트의 계약은 접근성이고 401 은 화면 진입의 정상 부산물이다.
            consoleGuard.expectErrors([{
                    id: 'E2E-CORE-LOGIN-A11Y-ME-401',
                    specScope: 'login-accessibility.spec.ts :: Accessibility Audit for Login Page',
                    channel: 'response',
                    urlPattern: /\/api\/v1\/auth\/me(?:\?|$)/,
                    messagePattern: null,
                    method: 'GET',
                    status: 401,
                    maxOccurrences: 4,
                    reason: '비로그인 상태의 로그인 화면이 세션 유무를 확인하는 초기 요청이다.',
                    expiresAt: '2026-12-31',
                }]);
            // Axe 감사에만 reduced-motion을 적용한다. 일반 UI 회귀는 실제 motion 경로를 계속 검증한다.
            await page.emulateMedia({ reducedMotion: 'reduce' });
            await openAnonymousLogin(page, '/login?e2e=true');
            await expect(page.getByRole('heading', { level: 1, name: '엔터프라이즈' })).toBeVisible({ timeout: 30000 });
            await expect(page.getByRole('main')).toHaveCount(1);
            await expect(page.getByRole('dialog')).toHaveCount(0);
            await expect(page.locator('header, #primary-sidebar')).toHaveCount(0);
            await expect(page.getByRole('textbox', { name: '아이디' })).toBeVisible();
            await expect(page.locator('[role="status"]').filter({
                hasText: /^(?:로딩 중|로그인 화면을 불러오는 중|애플리케이션을 준비하는 중|보안 세션을 확인하는 중)/,
            })).toHaveCount(0);
            await stabilizeAccessibilityAudit(page);
            const a11y = await new AxeBuilder({ page }).analyze();
            expect(a11y.violations, JSON.stringify(a11y.violations.map((v) => v.id))).toEqual([]);
        });
        // [2026-09-16 GAP-UIF-001] 번들한 Pretendard 가 실제로 쓰이는지는 선언이 아니라 계산된
        //   글꼴로만 알 수 있다. 변수를 body 에 두면 :root 에서 계산되는 --font-sans 별칭이 무효가
        //   되는데, 그때도 선언·preload 는 그대로라 소스만 보면 정상으로 보인다.
        test('본문 글꼴은 번들한 Pretendard 로 계산된다', async ({ page, consoleGuard }) => {
            consoleGuard.expectErrors([{
                    id: 'E2E-CORE-LOGIN-FONT-ME-401',
                    specScope: 'login-accessibility.spec.ts :: 본문 글꼴은 번들한 Pretendard 로 계산된다',
                    channel: 'response',
                    urlPattern: /\/api\/v1\/auth\/me(?:\?|$)/,
                    messagePattern: null,
                    method: 'GET',
                    status: 401,
                    maxOccurrences: 4,
                    reason: '비로그인 상태의 로그인 화면이 세션 유무를 확인하는 초기 요청이다.',
                    expiresAt: '2026-12-31',
                }]);
            await openAnonymousLogin(page, '/login?e2e=true');
            await expect(page.getByRole('heading', { level: 1, name: '엔터프라이즈' })).toBeVisible({ timeout: 30000 });
            const fontFamily = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
            expect(fontFamily.toLowerCase()).toContain('pretendard');
        });
    });
});
test.describe('인증 경계', () => {
    // ──────────────── E11: 접근성(a11y) — /login (color-contrast 포함, 미비활성) ────────────────
    test.describe('Accessibility (login page, strict)', () => {
        test('login page has no axe violations (color-contrast included)', async ({ page, consoleGuard }) => {
            consoleGuard.expectErrors([{
                    id: 'E2E-AUTH-LOGIN-A11Y-ME-401',
                    specScope: 'login-accessibility.spec.ts :: login page has no axe violations (color-contrast included)',
                    channel: 'response',
                    urlPattern: /\/api\/v1\/auth\/me(?:\?|$)/,
                    messagePattern: null,
                    method: 'GET',
                    status: 401,
                    maxOccurrences: 2,
                    reason: '비로그인 상태의 로그인 화면이 세션 유무를 확인하는 초기 요청이다.',
                    expiresAt: '2026-12-31',
                }]);
            await openAnonymousLogin(page, '/login');
            // 04-quality의 a11y는 color-contrast/heading-order를 비활성했으나, 공개 진입점 /login은 엄격히 검사한다.
            // 단, 감사 범위를 로그인 본문(<main id="main-content">)으로 스코프한다. 루트 레이아웃(AppShell)이 모든
            // 페이지를 전역 chrome(헤더 EG 로고/사이드바)으로 감싸므로, 그 chrome에서 발생하는 color-contrast 위반은
            // 이 테스트(제목대로 '로그인 폼' 감사)의 대상이 아니다. 로그인 폼 본문 자체는 이미 clean하다.
            //
            // [2026-07-27] color-contrast 가 회차마다 갈렸다. 원인은 설계가 아니라 **감사 시점**이었다 —
            // 로그인 카드는 framer-motion 진입 애니메이션(opacity 0→1, 0.8s + 아이콘 0.3s 지연) 안에 있고,
            // 페이드 도중에는 전경·배경이 모두 합성돼 대비가 낮게 나온다
            // (실측: 전경 #404a59 → #686e78/#9ca2ac, 배경 순백 → #cfd4da/#e0e3e7).
            // 정착 상태를 브라우저에서 직접 측정하면 카드 설명 rgb(64,74,89) on 순백 ≈ 8.2:1,
            // 푸터 rgb(2,8,23) on #f1f5f9 로 **둘 다 기준을 크게 넘는다**. 즉 앱은 정상이다.
            //
            // 대기만으로는 부족했다(2.5s + 조상 opacity 검사에도 부하 시 재발). 감사 대상 영역의 진입
            // 애니메이션을 명시적으로 무력화해 **정착 상태를 강제**한 뒤 감사한다 — 사용자가 실제로 보는
            // 상태를 재는 것이 이 테스트의 의도이며, 과도기 프레임을 재는 것은 의도가 아니다.
            await page.waitForLoadState('networkidle');
            await page.addStyleTag({
                content: `main#main-content, main#main-content * {
                opacity: 1 !important;
                transform: none !important;
                animation: none !important;
                transition: none !important;
            }`,
            });
            const results = await new AxeBuilder({ page }).include('main#main-content').analyze();
            expect(results.violations, `a11y 위반: ${JSON.stringify(results.violations.map((v) => v.id))}`).toEqual([]);
        });
    });
});
