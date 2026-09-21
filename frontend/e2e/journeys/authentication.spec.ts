import { expect,test } from '../fixtures/browser-test';
test.describe('공통 셸과 인증', () => {
    test.describe('Core Base (Auth & Dashboard)', () => {
        test.describe('Dashboard Integrity (Session Preserved)', () => {
            test.use({ storageState: 'playwright/.auth/admin.json' });
            test.beforeEach(async ({ page }) => {
                await page.goto('/admin');
            });
            // [2026-08-10 강화] 제목이 'Session Cleanup' 인데 **정리를 검증하지 않았다** — 리다이렉트만 봤다.
            //   그런데 로그아웃의 보안적 핵심은 "화면이 바뀌는가"가 아니라 **세션이 실제로 죽는가**다.
            //   /api/auth/logout 라우트는 accessToken·session_exp 를 만료시키고 백엔드 Set-Cookie 를
            //   포워딩하는데(logout/route.ts), 그 만료가 누락돼도 종전 단언은 전부 그린이었다:
            //   리다이렉트는 클라이언트가 수행하므로 쿠키가 남아 있어도 /login 으로 간다.
            //   → 쿠키 소멸과 '보호 경로 재진입 차단'까지 확인해 제목이 약속한 것을 실제로 검증한다.
            test('Logout Redirection and Session Cleanup', async ({ page, context, consoleGuard }) => {
                consoleGuard.expectErrors([{
                        id: 'E2E-CORE-LOGOUT-ME-401',
                        specScope: 'authentication.spec.ts :: Logout Redirection and Session Cleanup',
                        channel: 'response',
                        urlPattern: /\/api\/v1\/auth\/me(?:\?|$)/,
                        messagePattern: null,
                        method: 'GET',
                        status: 401,
                        minOccurrences: 0,
                        maxOccurrences: 2,
                        reason: '로그아웃 후 보호 경로 재진입 시 /login 으로 튕겨나와 세션 유무를 확인하는 요청이다.',
                        expiresAt: '2026-12-31',
                    }]);
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
});
test.describe('세션과 전역 탐색', () => {
    test.describe('Common Security & UI Validation', () => {
        test.use({ storageState: 'playwright/.auth/admin.json' });
        test('Session Integrity: Handling Token Clearance', async ({ page, context, consoleGuard }) => {
            // [2026-08-19 정정] 종전 주석은 "알림·재발급 오류는 이 계약에 필요하지 않으므로 발생하면
            //   독립 결함으로 실패한다"였다. 그러나 이 테스트는 쿠키만 지우고 페이지는 마운트된 채로 두므로,
            //   그 401들은 부산물이 아니라 **복구 경로 자체의 인과 사슬**이다:
            //     살아있는 useNotifications 폴링이 401 → 인터셉터가 /api/auth/reissue 시도 → 401
            //     → client.ts 가 /login?expired=true 로 이동 → 로그인 화면이 /auth/me 로 세션 확인 → 401
            //   즉 이 401들이 없으면 앱은 세션 소실을 감지하지도, 로그인으로 보내지도 못한다.
            //   광역 무시로 되돌리지 않고 이 테스트 범위에서 endpoint·method·status·횟수를 못박아
            //   401 폭주 같은 회귀는 계속 잡히게 한다.
            const sessionLossProbe = (id: string, urlPattern: RegExp, method: string, maxOccurrences: number, reason: string) => ({
                id,
                specScope: 'authentication.spec.ts :: Session Integrity: Handling Token Clearance',
                channel: 'response' as const,
                urlPattern,
                messagePattern: null,
                method,
                status: 401,
                minOccurrences: 0,
                maxOccurrences,
                reason,
                expiresAt: '2026-12-31',
            });
            consoleGuard.expectErrors([
                sessionLossProbe('E2E-SESSION-CLEARED-NOTIFICATIONS-401', /\/api\/v1\/notifications(?:\?|$)/, 'GET', 3, '마운트된 알림 폴링이 세션 소실을 발견하는 지점이다.'),
                sessionLossProbe('E2E-SESSION-CLEARED-UNREAD-COUNT-401', /\/api\/v1\/notifications\/unread-count(?:\?|$)/, 'GET', 3, '알림 폴링과 같은 회차에 나가는 미읽음 수 조회다.'),
                sessionLossProbe('E2E-SESSION-CLEARED-REISSUE-401', /\/api\/auth\/reissue(?:\?|$)/, 'POST', 2, 'refreshToken 도 지워졌으므로 설계된 재발급 시도가 정상 실패한다.'),
                sessionLossProbe('E2E-SESSION-CLEARED-ME-401', /\/api\/v1\/auth\/me(?:\?|$)/, 'GET', 2, '재발급 실패로 도착한 로그인 화면의 세션 확인 요청이다.'),
                // SockJS 는 WebSocket 이 막히면 xhr_streaming/xhr_send 로 폴백해 계속 재시도한다.
                // 쿠키가 지워졌으므로 그 전송도 401 이며, 이는 콘솔 채널 항목과 같은 사슬의
                // **응답 채널** 표현이다. 재시도 횟수가 타이밍에 좌우돼 간헐적으로만 관측된다
                // (CI run 32283793284 shard 2 에서 이 항목 부재로 red).
                sessionLossProbe('E2E-SESSION-CLEARED-SOCKJS-401', /\/ws\//, 'POST', 5, '세션 소실 후 SockJS 폴백 전송이 인증 거부되는 지점이다.'),
                // SockJS 는 폴백 전송을 붙이기 전에 GET /ws/info 로 전송 능력부터 조회한다.
                // 쿠키 소실 뒤 재연결은 이 handshake 에서 시작하므로 위 POST 폴백과 같은 사슬의
                // 첫 요청이며, 쿠키 삭제와 로그인 리다이렉트 사이 창에 재연결이 걸릴 때만
                // 간헐 관측된다 (CI run 32573925248 shard 2 에서 이 항목 부재로 red — 위
                // POST 전용 항목이 GET 을 소비하지 못했다).
                sessionLossProbe('E2E-SESSION-CLEARED-SOCKJS-INFO-401', /\/ws\/info(?:\?|$)/, 'GET', 2, '세션 소실 후 SockJS 재연결 handshake(transport 조회)가 인증 거부되는 지점이다.'),
                // 이 테스트는 board-masters 화면을 마운트한 채 쿠키를 지운다. 그 화면 자신의 목록
                // 재조회(focus/refetch)가 리다이렉트 이전 창에 걸리면 401 이 되며, 이 역시 위 알림·
                // 재발급과 같은 "마운트된 페이지가 세션 소실을 발견하는 사슬"이다 (CI run 32616382252
                // attempt 1·2 연속 재현 — 이 항목 부재로 red).
                sessionLossProbe('E2E-SESSION-CLEARED-PAGE-DATA-401', /\/api\/v1\/admin\/system\/board-masters(?:\?|$)/, 'GET', 2, '쿠키 삭제 후 마운트된 board-masters 화면의 목록 재조회가 정상적으로 인증 거부되는 지점이다.'),
                {
                    id: 'E2E-SESSION-CLEARED-WS-ERROR',
                    specScope: 'authentication.spec.ts :: Session Integrity: Handling Token Clearance',
                    channel: 'console' as const,
                    urlPattern: null,
                    messagePattern: /HTTP Authentication failed|WebSocket connection to.*failed/,
                    method: null,
                    status: null,
                    minOccurrences: 0,
                    maxOccurrences: 3,
                    reason: '토큰 삭제 후 SockJS WebSocket 연결이 인증 거부되는 콘솔 에러다.',
                    expiresAt: '2026-12-31',
                },
                {
                    id: 'E2E-SESSION-CLEARED-NOTIF-CONSOLE-ERROR',
                    specScope: 'authentication.spec.ts :: Session Integrity: Handling Token Clearance',
                    channel: 'console' as const,
                    urlPattern: null,
                    messagePattern: /Failed to fetch notifications.*유효하지 않은 토큰입니다/,
                    method: null,
                    status: null,
                    minOccurrences: 0,
                    maxOccurrences: 3,
                    reason: '토큰 삭제 후 알림 폴링 실패 시 콘솔에 로깅되는 에러다.',
                    expiresAt: '2026-12-31',
                },
            ]);
            console.log('>>> Step 1: Navigating to a protected admin page');
            const authenticatedMenus = page.waitForResponse(response => new URL(response.url()).pathname === '/api/v1/menus/head'
                && response.request().method() === 'GET'
                && response.status() === 200);
            await page.goto('/admin/community/boards/master');
            await expect(page).toHaveURL(/.*master/);
            // main CI 34477985094: URL 도착 직후 쿠키를 지우면 첫 메뉴 조회가 hydration 뒤 401이 된다.
            await expect(page.getByRole('button', { name: '사용자 계정 메뉴', exact: true })).toBeVisible();
            await expect(page.getByRole('navigation', { name: '주메뉴 네비게이션', exact: true }).getByRole('link').first()).toBeVisible();
            await expect(page.getByRole('heading', { name: '게시판 마스터 콘솔', exact: true })).toBeVisible();
            // SSR initialData가 메뉴 조회를 생략해도 실제 인증 상태를 확인할 수 있도록 같은 출처로 조회한다.
            const menuStatus = await page.evaluate(async () => (await fetch('/api/v1/menus/head', {
                credentials: 'same-origin', cache: 'no-store',
            })).status);
            expect(menuStatus, '세션 소실 전 메뉴 조회는 인증된 상태로 성공해야 한다').toBe(200);
            await authenticatedMenus;
            console.log('>>> Step 2: Clearing cookies and localStorage to simulate session expiration');
            // CI 34315391348 trace: 쿠키 삭제 뒤 GET /ws/083/zwtnev2m/eventsource가 401이고
            // 로그인 화면에는 정상 도착했다. 인증된 진입 후에만 이 세션 소실 응답 1회를 검증한다.
            consoleGuard.expectErrors([
                sessionLossProbe('E2E-SESSION-CLEARED-SOCKJS-EVENTSOURCE-401', /\/ws\/[0-9]{3}\/[A-Za-z0-9_-]+\/eventsource(?:\?|$)/, 'GET', 1, '쿠키 삭제 뒤 SockJS EventSource 전송도 인증 거부되어야 한다.'),
            ]);
            await context.clearCookies();
            await page.evaluate(() => localStorage.clear());
            const deniedEventSource = await context.request.get('/ws/000/expired0/eventsource');
            expect(deniedEventSource.status(), '세션 없는 EventSource 전송은 인증 거부되어야 함').toBe(401);
            console.log('>>> Step 3: Attempting a protected navigation');
            // API 인터셉터와 middleware가 모두 세션 소실을 감지할 수 있어 보호 경로 탐색은 다른
            // 로그인 탐색에 의해 중단될 수 있다. 시작한 탐색의 기대 중단만 허용하고, 특정 navigation의
            // load-state가 아니라 사용자가 최종적으로 도착한 URL과 로그인 화면을 검증한다.
            await page.goto('/admin/community/boards/master', { waitUntil: 'domcontentloaded' }).catch((error: unknown) => {
                const message = error instanceof Error ? error.message : String(error);
                if (!/net::ERR_ABORTED|interrupted by another navigation/i.test(message))
                    throw error;
            });
            await expect(page).toHaveURL(/\/login(?:\?|$)/, { timeout: 15000 });
            await expect(page.getByRole('heading', { name: '엔터프라이즈', exact: true })).toBeVisible();
            console.log('>>> Correctly redirected to login after session loss');
        });
    });
});
test.describe('인증 경계', () => {
    // ───────── E0: 로그인 성공(회귀 방어) — 이중 프리픽스 파손(2026-07-17 확증) 재발 차단 ─────────
    // 배경: authService.login 이 baseURL('/api/v1') 전치로 '/api/v1/api/auth/login'(백엔드 401)을 호출해
    //       Next Route Handler(HttpOnly 쿠키 설정)에 도달하지 못하던 P0 회귀가 있었다. 전 티어가 auth.setup.ts
    //       의 백엔드 직결 로그인 storageState 를 재사용해 '성공 UI 로그인' 경로가 무검증이던 것이 원인.
    //       이 테스트는 실 LoginClient→authService→Route Handler 경로를 UI 로 구동해 그 공백을 메운다.
    test.describe('Login success (UI flow — anti-regression for double-prefix)', () => {
        test('valid credentials authenticate via Route Handler and set HttpOnly session cookie', async ({ page, context, consoleGuard }) => {
            // /login 초기 로드 시 AuthContext가 인증상태 확인차 /auth/me를 호출하는 401 한 건만 허용한다.
            consoleGuard.expectErrors([{
                    id: 'E2E-AUTH-LOGIN-PAGE-ME-401',
                    specScope: 'authentication.spec.ts :: valid credentials authenticate via Route Handler and set HttpOnly session cookie',
                    channel: 'response',
                    urlPattern: /\/api\/v1\/auth\/me(?:\?|$)/,
                    messagePattern: null,
                    method: 'GET',
                    status: 401,
                    maxOccurrences: 1,
                    reason: '비로그인 상태의 로그인 화면이 세션 유무를 확인하는 초기 요청이다.',
                    expiresAt: '2026-12-31',
                }]);
            await page.goto('/login');
            const idInput = page.getByRole('textbox', { name: '아이디', exact: true });
            const passwordInput = page.getByLabel('비밀번호', { exact: true });
            await idInput.fill('webmaster');
            await passwordInput.fill('1');
            // Route Handler(/api/auth/login) 200 을 실제로 관측 — 이중 프리픽스면 이 응답이 오지 않는다.
            const [loginResp] = await Promise.all([
                page.waitForResponse((r) => r.url().includes('/api/auth/login') && r.request().method() === 'POST', { timeout: 20000 }),
                page.locator('button[type="submit"]').click(),
            ]);
            expect(loginResp.status(), 'UI 로그인이 Route Handler 200 을 받지 못함(이중 프리픽스 회귀 의심)').toBe(200);
            /*
              인증 성공 시 기본 착지로 이동하고 /login 을 벗어난다.
    
              [2026-09-12] 기본 착지가 `/admin/work-hub` 에서 `/` 로 바뀌었다 — 워크허브는 demo pack
              소유라 파생 제품에서 제거되는데, 그 값이면 **로그인 착지부터 404** 였다(DEC-OPS-083).
              그래서 `/admin` 정규식 대신 **기본 착지 자체**를 고정한다. `not.toHaveURL(/login/)` 만
              남기면 어디로 가든 통과하므로 착지 회귀를 못 잡는다.
            */
            // origin 바로 뒤가 끝이어야 한다 — `\/(?:\?.*)?$` 로는 `/admin/` 같은 경로도 통과한다.
            await expect(page).toHaveURL(/^https?:\/\/[^/]+\/(?:\?[^#]*)?(?:#.*)?$/, { timeout: 20000 });
            await expect(page).not.toHaveURL(/\/login/);
            // Route Handler가 accessToken을 제품 쿠키 속성으로 심었는지 확인한다.
            // required CI는 production build/start이므로 Secure도 직접 증명한다. 로컬 next dev의
            // 평문 loopback 예외에서는 Secure를 요구하지 않는다.
            const cookies = await context.cookies();
            const at = cookies.find((c) => c.name === 'accessToken');
            expect(at, 'accessToken 쿠키 미설정').toBeTruthy();
            expect(at?.httpOnly, 'accessToken 이 HttpOnly 가 아님').toBe(true);
            expect(at?.sameSite, 'accessToken 이 SameSite=Strict 가 아님').toBe('Strict');
            if (process.env.CI === 'true') {
                expect(at?.secure, 'production CI의 accessToken 에 Secure가 없음').toBe(true);
            }
        });
    });
    // ───────────────────────── E2: 로그인 실패(잘못된 자격증명) ─────────────────────────
    test.describe('Login failure (negative auth)', () => {
        test('invalid password shows error and does NOT authenticate', async ({ page, consoleGuard }) => {
            // 초기 세션 확인 401과 의도적으로 잘못 보낸 로그인 401만 허용한다. 인증 거부는 사용자 오류
            // surface로 처리하며 AuthContext/LoginClient가 콘솔에 중복 오류를 남기지 않는 것이 현재 계약이다.
            consoleGuard.expectErrors([
                {
                    id: 'E2E-AUTH-INVALID-PAGE-ME-401',
                    specScope: 'authentication.spec.ts :: invalid password shows error and does NOT authenticate',
                    channel: 'response',
                    urlPattern: /\/api\/v1\/auth\/me(?:\?|$)/,
                    messagePattern: null,
                    method: 'GET',
                    status: 401,
                    maxOccurrences: 1,
                    reason: '비로그인 상태의 로그인 화면이 세션 유무를 확인하는 초기 요청이다.',
                    expiresAt: '2026-12-31',
                },
                {
                    id: 'E2E-AUTH-INVALID-CREDENTIALS-401',
                    specScope: 'authentication.spec.ts :: invalid password shows error and does NOT authenticate',
                    channel: 'response',
                    urlPattern: /\/api\/auth\/login(?:\?|$)/,
                    messagePattern: null,
                    method: 'POST',
                    status: 401,
                    maxOccurrences: 1,
                    reason: '잘못된 비밀번호를 제출해 인증 거부 UI와 접근성 계약을 검증한다.',
                    expiresAt: '2026-12-31',
                },
            ]);
            await page.goto('/login');
            const idInput = page.getByRole('textbox', { name: '아이디', exact: true });
            const passwordInput = page.getByLabel('비밀번호', { exact: true });
            await idInput.fill('webmaster');
            await passwordInput.fill('definitely-wrong-pw-Zz9!');
            await page.locator('button[type="submit"]').click();
            // LoginClient는 실패 시 data-testid="login-error"로 오류를 표시하고 /admin으로 이동하지 않는다.
            const loginError = page.getByTestId('login-error');
            await expect(loginError).toBeVisible({ timeout: 15000 });
            await expect(page).not.toHaveURL(/\/admin/);
            await expect(page).toHaveURL(/\/login/);
            // [W1-24] 오류가 보조기술에 통보되는지 고정한다.
            //   role="alert" 는 aria-live="assertive" 를 함의한다. 이 블록은 조건부 렌더라 노드가 새로
            //   삽입되는 구조이고, 라이브 리전이 없으면 스크린리더에 아무 알림도 가지 않는다.
            await expect(loginError).toHaveAttribute('role', 'alert');
            // [W1-24] 실패 후 포커스가 아이디 입력으로 돌아오는지.
            //   종전에는 '로그인' 버튼에 머물러 키보드 사용자가 재입력 위치를 찾지 못했다.
            await expect(idInput).toBeFocused();
            // [W1-24] 死 컨트롤 2종이 사라졌는지. 특히 '비밀번호 찾기' 는 type 누락으로 form 을 제출해
            //   클릭 시 진짜 로그인 시도가 발사됐다(로그인 로그 오염·잠금 카운터 소모).
            await expect(page.getByText('비밀번호를 잊으셨나요?')).toHaveCount(0);
            await expect(page.locator('#remember')).toHaveCount(0);
        });
    });
    // ───────────── E1: 위조 토큰 거부 — 미들웨어 JWT 서명 검증(Web Crypto HMAC) ─────────────
    // Phase 1 하드닝: 미들웨어가 accessToken 의 서명·만료를 실제 검증한다. base64 페이로드만 디코드하던
    // 과거엔 서명 없는 위조 토큰(role=ADMIN·미래 exp)으로 관리자 UI 셸을 열람할 수 있었다 — 이를 차단한다.
    test.describe('Forged-token rejection (middleware signature verification)', () => {
        test.use({ storageState: 'playwright/.auth/admin.json' });
        // header=HS512, payload={role:ROLE_ADMIN, exp:먼 미래}, 서명='invalidsig'(위조). 과거 미들웨어는 통과시켰다.
        const FORGED_ADMIN_TOKEN = 'eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJVU1JDTkZSTV8wMDAwMDAwMDAwMSIsInJvbGUiOiJST0xFX0FETUlOIiwiZXhwIjo5OTk5OTk5OTk5fQ.invalidsig';
        test('forged (bad-signature) admin token is rejected by middleware → /login', async ({ page, context, consoleGuard, baseURL }) => {
            // 미들웨어가 /login 으로 돌려보낸 뒤 AuthContext 가 세션 유무를 확인한다. 위조 토큰이므로 401 이
            // 나오는 것이 이 테스트가 증명하려는 거부 동작 자체다.
            consoleGuard.expectErrors([{
                    id: 'E2E-AUTH-FORGED-TOKEN-ME-401',
                    specScope: 'authentication.spec.ts :: forged (bad-signature) admin token is rejected by middleware → /login',
                    channel: 'response',
                    urlPattern: /\/api\/v1\/auth\/me(?:\?|$)/,
                    messagePattern: null,
                    method: 'GET',
                    status: 401,
                    // 미들웨어가 /login 으로 돌려보낸 뒤 AuthContext 가 세션 확인을 쏘기 전에 URL 단언이
                    // 끝나는 회차가 있다. 발생 여부가 타이밍에 좌우되므로 하한을 두지 않는다 —
                    // 하한 1을 유지하면 '예상 오류가 안 나서' 실패한다(CI run 32286417769 shard 3 실측).
                    // 이 테스트의 계약은 /login 리다이렉트이고, 401 은 그 뒤에 따라올 수도 있는 부산물이다.
                    minOccurrences: 0,
                    maxOccurrences: 2,
                    reason: '거부 후 도착한 로그인 화면이 세션 유무를 확인하는 초기 요청이다.',
                    expiresAt: '2026-12-31',
                }]);
            // 유효 세션 쿠키를 위조 토큰으로 덮어쓴다. 미들웨어가 서명 검증 실패로 로그인으로 돌려보내야 한다.
            await context.addCookies([
                { name: 'accessToken', value: FORGED_ADMIN_TOKEN, url: baseURL!, httpOnly: true, sameSite: 'Strict' },
            ]);
            await page.goto('/admin/system/menus');
            // 위조 토큰으로는 관리자 셸에 진입하지 못하고 /login 으로 리다이렉트된다.
            await expect(page).toHaveURL(/\/login/, { timeout: 20000 });
        });
        test('unknown-algorithm (alg=none style) token is rejected → /login', async ({ page, context, consoleGuard, baseURL }) => {
            consoleGuard.expectErrors([{
                    id: 'E2E-AUTH-NONE-ALG-TOKEN-ME-401',
                    specScope: 'authentication.spec.ts :: unknown-algorithm (alg=none style) token is rejected → /login',
                    channel: 'response',
                    urlPattern: /\/api\/v1\/auth\/me(?:\?|$)/,
                    messagePattern: null,
                    method: 'GET',
                    status: 401,
                    // 바로 위 forged-token 테스트와 구조가 같다 — URL 단언 직후 종료하므로 세션 확인
                    // 요청과 경합한다. 같은 이유로 하한을 두지 않는다.
                    // (a11y 계열은 axe 스캔이 뒤따라 결정적으로 발생하므로 하한 1을 유지한다.
                    //  minOccurrences:0 을 남발하면 stale 항목을 탐지하는 능력을 잃는다.)
                    minOccurrences: 0,
                    maxOccurrences: 2,
                    reason: '거부 후 도착한 로그인 화면이 세션 유무를 확인하는 초기 요청이다.',
                    expiresAt: '2026-12-31',
                }]);
            // alg 화이트리스트(HS256/384/512) 밖은 거부. header.alg='none'.
            const NONE_ALG_TOKEN = 'eyJhbGciOiJub25lIn0.eyJzdWIiOiJhZG1pbiIsInJvbGUiOiJST0xFX0FETUlOIiwiZXhwIjo5OTk5OTk5OTk5fQ.';
            await context.addCookies([
                { name: 'accessToken', value: NONE_ALG_TOKEN, url: baseURL!, httpOnly: true, sameSite: 'Strict' },
            ]);
            await page.goto('/admin/system/menus');
            await expect(page).toHaveURL(/\/login/, { timeout: 20000 });
        });
    });
});
