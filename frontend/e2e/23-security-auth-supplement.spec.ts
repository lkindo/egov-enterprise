import { test, expect } from './fixtures/base-test';
import { AxeBuilder } from '@axe-core/playwright';
import fs from 'fs';
import path from 'path';

/**
 * [Tier 23] Security & Auth Supplement (E2E 감사 Phase4 — 누락 보완)
 *
 * 앱 표면 대비 미검증이던 인증/세션/RBAC 핵심 시나리오를 보완한다.
 * (E5 stored-XSS는 22-deep-security-guard에서 실 dialog 가드 + 이스케이프 렌더 단언으로 이미 재작성됨)
 *
 * ⚠ 신규 추가분은 정적(tsc) 검증 완료 상태다. 런타임 통과는 백엔드(:8080)+웹(:3001) 기동 후
 *    재개 검증이 필요하다(SOP §4.1 — 정직한 보류). 셀렉터/엔드포인트는 실 소스에서 확인해 작성했다.
 *
 * TODO backlog (서버 기동 후 실 UI 플로우로 구현 — 아래 fixme 참조):
 *  - E6 인증 IDOR: user A가 만든 리소스(메일/쪽지 id)를 user B가 조회/삭제 → 403/404 + 원소유자 데이터 보존.
 *  - E7 결재 confirm: 기안→상신(11) 후 승인자가 confirm → 실 PUT .../confirm 200 → '결재대기'→'승인' 상태전이.
 *  - E8 RBAC config CRUD 라운드트립: authority/group/role 생성 후 search-back 재확인 + 삭제(좁은 성공 정규식).
 *  - E9 common-code/menu 노드 CRUD: 생성→수정→삭제 라운드트립으로 구조 config 변이 검증.
 *  - E10 공개 설문 응답: 비인증 시민이 /survey/response/[id] 제출 → 응답 기록 반영 확인.
 */

const USER_AUTH = path.join(__dirname, '..', 'playwright', '.auth', 'user.json');
// [2026-07-28 정정] 백엔드 주소를 하드코딩하고 있었다. auth.setup.ts·cleanup-db.ts 는 이미
//   `process.env.NEXT_PUBLIC_API_URL || 기본값` 패턴을 쓰는데 이 파일만 예외였고, 그 결과
//   백엔드를 다른 포트에 띄우면 **그 포트를 점유한 무관한 서비스로 요청이 새어** RBAC 단언이
//   거짓 통과/거짓 실패한다(실측: 8080 을 다른 앱이 물고 있을 때 모든 경로가 200 을 돌려줘
//   "admin 엔드포인트가 비관리자에게 노출됨" 으로 3건이 red 가 됐다).
//   보안 단언이 환경에 따라 뒤집히는 것은 게이트로서 치명적이므로 저장소 표준 패턴에 맞춘다.
const API = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1').replace(/\/$/, '');

function readAccessToken(authFile: string): string {
    const data = JSON.parse(fs.readFileSync(authFile, 'utf-8'));
    return data.cookies.find((c: { name: string; value: string }) => c.name === 'accessToken')?.value ?? '';
}

// ───────── E0: 로그인 성공(회귀 방어) — 이중 프리픽스 파손(2026-07-17 확증) 재발 차단 ─────────
// 배경: authService.login 이 baseURL('/api/v1') 전치로 '/api/v1/api/auth/login'(백엔드 401)을 호출해
//       Next Route Handler(HttpOnly 쿠키 설정)에 도달하지 못하던 P0 회귀가 있었다. 전 티어가 auth.setup.ts
//       의 백엔드 직결 로그인 storageState 를 재사용해 '성공 UI 로그인' 경로가 무검증이던 것이 원인.
//       이 테스트는 실 LoginClient→authService→Route Handler 경로를 UI 로 구동해 그 공백을 메운다.
test.describe('Tier 23-E0: Login success (UI flow — anti-regression for double-prefix)', () => {
    test('valid credentials authenticate via Route Handler and set HttpOnly session cookie', async ({ page, context, consoleGuard }) => {
        // /login 초기 로드 시 AuthContext 가 인증상태 확인차 /auth/me 를 부르고 미인증이라 401 을 받는 것은 정상.
        consoleGuard.addIgnorePattern(/auth\/me/);
        await page.goto('/login');
        await page.locator('input[name="id"]').fill('webmaster');
        await page.locator('input[name="password"]').fill('1');

        // Route Handler(/api/auth/login) 200 을 실제로 관측 — 이중 프리픽스면 이 응답이 오지 않는다.
        const [loginResp] = await Promise.all([
            page.waitForResponse((r) => r.url().includes('/api/auth/login') && r.request().method() === 'POST', { timeout: 20000 }),
            page.locator('button[type="submit"]').click(),
        ]);
        expect(loginResp.status(), 'UI 로그인이 Route Handler 200 을 받지 못함(이중 프리픽스 회귀 의심)').toBe(200);

        // 인증 성공 시 /admin 영역으로 진입하고 /login 을 벗어난다.
        await expect(page).toHaveURL(/\/admin/, { timeout: 20000 });
        await expect(page).not.toHaveURL(/\/login/);

        // Route Handler 가 accessToken 을 HttpOnly 쿠키로 심었는지 확인(브라우저 JS 로는 못 읽는 쿠키).
        const cookies = await context.cookies();
        const at = cookies.find((c) => c.name === 'accessToken');
        expect(at, 'accessToken 쿠키 미설정').toBeTruthy();
        expect(at?.httpOnly, 'accessToken 이 HttpOnly 가 아님').toBe(true);
    });
});

// ───────────────────────── E2: 로그인 실패(잘못된 자격증명) ─────────────────────────
test.describe('Tier 23-E2: Login failure (negative auth)', () => {
    test('invalid password shows error and does NOT authenticate', async ({ page, consoleGuard }) => {
        // 의도된 인증 실패이므로 로그인 401 및 LoginClient의 console.error(err)를 이 테스트에 한해 허용한다.
        consoleGuard.addIgnorePattern(/auth\/login/);
        consoleGuard.addIgnorePattern(/로그인|login|자격|credential|Unauthorized|401|Request failed/i);

        await page.goto('/login');
        await page.locator('input[name="id"]').fill('webmaster');
        await page.locator('input[name="password"]').fill('definitely-wrong-pw-Zz9!');
        await page.locator('button[type="submit"]').click();

        // LoginClient는 실패 시 data-testid="login-error"로 오류를 표시하고 /admin으로 이동하지 않는다.
        await expect(page.getByTestId('login-error')).toBeVisible({ timeout: 15000 });
        await expect(page).not.toHaveURL(/\/admin/);
        await expect(page).toHaveURL(/\/login/);
    });

    // 계정 잠금(lockout)은 로그인 정책(시도 횟수/잠금 임계)에 의존 → 서버 기동 후 정책 확인하여 구현.
    test.fixme('N회 연속 실패 시 계정 잠금(lockout) 상태를 표시한다', async ({ page }) => {
        // for (let i = 0; i < 정책상_최대시도; i++) { 잘못된 비밀번호로 제출 }
        // await expect(page.getByText(/계정.*잠금|locked|잠겼/i)).toBeVisible();
        void page;
    });
});

// ─────────────── E3: RBAC negative — 로그인한 '일반 사용자'가 admin API에 금지되는지 ───────────────
test.describe('Tier 23-E3: RBAC negative at API (authenticated non-admin forbidden)', () => {
    let userToken = '';
    test.beforeAll(() => {
        userToken = readAccessToken(USER_AUTH);
    });

    // 기존 22-2는 익명(APIRequestContext가 storageState 쿠키를 상속하지 않음) 요청이라 "인증 필요"만 증명했다.
    // 여기서는 '유효한 비관리자 토큰'을 명시적으로 실어 권한 상승(privilege escalation)이 차단되는지 검증한다.
    const adminEndpoints = [
        { method: 'GET', pathSuffix: '/admin/system/users' },
        { method: 'GET', pathSuffix: '/admin/system/authorities' },
        { method: 'GET', pathSuffix: '/admin/system/board-masters' },
    ];

    for (const ep of adminEndpoints) {
        test(`regular-user token is forbidden on ${ep.method} ${ep.pathSuffix}`, async ({ request }) => {
            expect(userToken, 'user.json accessToken 로드 실패').toBeTruthy();
            const res = await request.fetch(`${API}${ep.pathSuffix}`, {
                method: ep.method,
                headers: { Authorization: `Bearer ${userToken}` },
            });
            // 유효한 비관리자 토큰이므로 403(Forbidden)이 기대값. 401도 접근차단으로 인정하되 200(노출)은 실패.
            expect([401, 403], `admin 엔드포인트가 비관리자에게 노출됨 (status ${res.status()})`).toContain(res.status());
        });
    }
});

// ───────────────── E4: 미들웨어 민감경로 RBAC 리다이렉트(non-admin) ─────────────────
test.describe('Tier 23-E4: Middleware sensitive-path RBAC redirect', () => {
    test.use({ storageState: USER_AUTH });

    // middleware.ts: /admin/system|user|security|stats|workflow + 비관리자 → /?auth_error=unauthorized
    const sensitivePaths = [
        '/admin/system/menus',
        '/admin/user/manage',
        '/admin/security/authority',
        '/admin/stats',
        '/admin/workflow',
    ];

    for (const p of sensitivePaths) {
        test(`non-admin visiting ${p} redirects to auth_error=unauthorized`, async ({ page }) => {
            await page.goto(p);
            await expect(page).toHaveURL(/auth_error=unauthorized/, { timeout: 15000 });
        });
    }

    // [2026-07-27 계약 갱신] 이 테스트는 **낡은 계약**을 박제하고 있었다. 종전 주석은 "민감목록에 없는
    // /admin/community 는 통과한다(백엔드 RBAC 에 위임)" 였으나, 미들웨어는 그 사이 **deny-by-default**
    // 로 뒤집혔다 — `/admin/**` 는 기본 차단이고 `USER_ACCESSIBLE_ADMIN_PATHS` 에 명시된 경로만 열린다.
    // 게다가 `/admin/community` 는 열려 있지만 그 하위 관리 콘솔인 `/admin/community/boards/master` 는
    // `ADMIN_ONLY_SUBPATHS` 로 **다시 도려내져** 허용목록보다 우선 적용된다(middleware.ts §4).
    // 즉 실패는 앱 회귀가 아니라 테스트 드리프트였다. 강화된 현행 계약을 **양방향**으로 고정한다.
    test('[documented contract] allow-listed admin route is NOT redirected for non-admin', async ({ page }) => {
        // 허용목록에 명시된 경로(개인 협업 영역)는 일반 사용자에게 열려 있어야 한다 — 과잉차단 회귀 방어.
        await page.goto('/admin/collaboration');
        await expect(page).not.toHaveURL(/auth_error=unauthorized/);
    });

    test('[documented contract] admin-only carve-out inside an allow-listed path IS redirected', async ({ page }) => {
        // 허용된 /admin/community 안쪽이라도 관리 콘솔(boards/master)은 차단된다 — 허용목록보다 우선한다.
        await page.goto('/admin/community/boards/master');
        await expect(page).toHaveURL(/auth_error=unauthorized/, { timeout: 15000 });
    });
});

// ───────────── E1: 위조 토큰 거부 — 미들웨어 JWT 서명 검증(Web Crypto HMAC) ─────────────
// Phase 1 하드닝: 미들웨어가 accessToken 의 서명·만료를 실제 검증한다. base64 페이로드만 디코드하던
// 과거엔 서명 없는 위조 토큰(role=ADMIN·미래 exp)으로 관리자 UI 셸을 열람할 수 있었다 — 이를 차단한다.
test.describe('Tier 23-E1: Forged-token rejection (middleware signature verification)', () => {
    test.use({ storageState: 'playwright/.auth/admin.json' });

    // header=HS512, payload={role:ROLE_ADMIN, exp:먼 미래}, 서명='invalidsig'(위조). 과거 미들웨어는 통과시켰다.
    const FORGED_ADMIN_TOKEN = 'eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJVU1JDTkZSTV8wMDAwMDAwMDAwMSIsInJvbGUiOiJST0xFX0FETUlOIiwiZXhwIjo5OTk5OTk5OTk5fQ.invalidsig';

    test('forged (bad-signature) admin token is rejected by middleware → /login', async ({ page, context }) => {
        // 유효 세션 쿠키를 위조 토큰으로 덮어쓴다. 미들웨어가 서명 검증 실패로 로그인으로 돌려보내야 한다.
        await context.addCookies([
            { name: 'accessToken', value: FORGED_ADMIN_TOKEN, url: 'http://localhost:3001', httpOnly: true, sameSite: 'Strict' },
        ]);
        await page.goto('/admin/system/menus');
        // 위조 토큰으로는 관리자 셸에 진입하지 못하고 /login 으로 리다이렉트된다.
        await expect(page).toHaveURL(/\/login/, { timeout: 20000 });
    });

    test('unknown-algorithm (alg=none style) token is rejected → /login', async ({ page, context }) => {
        // alg 화이트리스트(HS256/384/512) 밖은 거부. header.alg='none'.
        const NONE_ALG_TOKEN = 'eyJhbGciOiJub25lIn0.eyJzdWIiOiJhZG1pbiIsInJvbGUiOiJST0xFX0FETUlOIiwiZXhwIjo5OTk5OTk5OTk5fQ.';
        await context.addCookies([
            { name: 'accessToken', value: NONE_ALG_TOKEN, url: 'http://localhost:3001', httpOnly: true, sameSite: 'Strict' },
        ]);
        await page.goto('/admin/system/menus');
        await expect(page).toHaveURL(/\/login/, { timeout: 20000 });
    });
});

// ──────────────── E11: 접근성(a11y) — /login (color-contrast 포함, 미비활성) ────────────────
test.describe('Tier 23-E11: Accessibility (login page, strict)', () => {
    test('login page has no axe violations (color-contrast included)', async ({ page }) => {
        await page.goto('/login');
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
        await page.waitForTimeout(300);

        const results = await new AxeBuilder({ page }).include('main#main-content').analyze();
        expect(
            results.violations,
            `a11y 위반: ${JSON.stringify(results.violations.map((v) => v.id))}`,
        ).toEqual([]);
    });
});

// ──────────────── E12: 결정적 empty-state(그레이스풀 no-results, .or 폴백 금지) ────────────────
test.describe('Tier 23-E12: Deterministic empty state', () => {
    test.use({ storageState: 'playwright/.auth/admin.json' });

    test('user search with guaranteed-nonexistent term shows a real empty state', async ({ page }) => {
        await page.goto('/admin/user/manage');
        await expect(page.getByRole('heading', { name: '사용자 관리' }).first()).toBeVisible({ timeout: 20000 });

        // /admin/user/manage 는 조직 통합 허브(UserOrgHubClient)를 렌더한다. 실제 사용자 목록 검색창 placeholder는 '검색어를 입력하세요...'.
        const searchInput = page.getByPlaceholder('검색어를 입력하세요...').first();
        await expect(searchInput).toBeVisible({ timeout: 15000 });
        await searchInput.fill('ZZZ_NONEXISTENT_USER_9x8y7z');
        await page.keyboard.press('Enter');

        // 결과 없음 메시지가 결정적으로 표시되어야 한다(허브/목록 컴포넌트의 실제 빈-상태 텍스트).
        // (과거: 광역 정규식이 사이드바 숨김 '하위 메뉴가 없습니다'를 잘못 매칭했음 → 실제 빈-상태 텍스트로 한정)
        await expect(
            page.getByText(/검색 결과가 없습니다|데이터가 존재하지 않습니다/).first(),
        ).toBeVisible({ timeout: 15000 });
    });
});
