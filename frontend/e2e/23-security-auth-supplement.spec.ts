import { test, expect } from './fixtures/base-test';
import type { APIRequestContext } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';
import fs from 'fs';
import path from 'path';

/**
 * [Tier 23] Security & Auth Supplement — 인증·세션·RBAC 계약의 단일 소유자
 *
 * 이 파일은 "앱 표면 대비 미검증이던 시나리오 보완"으로 출발했으나(E2E 감사 Phase4),
 * 2026-08-10 최적화에서 **흩어져 있던 접근통제 검증의 소유자**로 승격됐다.
 * 종전에는 같은 미들웨어 한 줄을 네 파일이 서로 모르게 중복 검사하면서, 정작 정책 목록의
 * 대부분은 한 번도 검증되지 않는 상태였다. 아래로 흡수·통합했다:
 *   · 03-board-master-management  'Access Denied for Regular User'            → E4 carve-out
 *   · 04-quality-resilience       'Denied Admin Access for Regular User'      → E4 denied 매트릭스
 *   · 22-deep-security-guard      'Access Denied for Direct User ID …'        → E4 쿼리스트링 케이스
 *   · 22-deep-security-guard      'API Boundary: Unauthorized Direct API …'   → E3 익명 케이스
 *
 * 구성:
 *   E0  UI 로그인 성공 (Route Handler 200 + HttpOnly 쿠키)      — 이중 프리픽스 회귀 방어
 *   E1  위조/알고리즘 우회 토큰 거부                              — 미들웨어 서명검증 (Edge 런타임 실물)
 *   E2  로그인 실패 (오류 노출·포커스 복귀·死 컨트롤 부재)
 *   E3  API RBAC negative (비관리자 토큰 · 익명)                  — 백엔드가 authoritative
 *   E4  미들웨어 /admin 경로 정책 매트릭스 (deny/allow/우회)      — HTTP 층, + E4c 브라우저 카나리아
 *   E5  Zero-Trust Origin 가드 (접미사 도메인 우회 차단)
 *   E11 접근성 (로그인 본문, color-contrast 포함 엄격)
 *   E12 결정적 empty-state
 *
 * ⚠ 검증 층위 원칙: 미들웨어 '판정 로직'은 HTTP 로, '브라우저 배선'은 카나리아 1건으로,
 *   '데이터 권한'은 백엔드 API 로 각각 한 층에서만 검증한다. 같은 계약을 여러 층에서
 *   되풀이하지 않는다 — 그것이 이 파일이 통합 대상이 된 이유다.
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
        await expect(page.locator('input[name="id"]')).toBeFocused();

        // [W1-24] 死 컨트롤 2종이 사라졌는지. 특히 '비밀번호 찾기' 는 type 누락으로 form 을 제출해
        //   클릭 시 진짜 로그인 시도가 발사됐다(로그인 로그 오염·잠금 카운터 소모).
        await expect(page.getByText('비밀번호를 잊으셨나요?')).toHaveCount(0);
        await expect(page.locator('#remember')).toHaveCount(0);
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

    // [2026-08-10 흡수] 22-deep-security-guard 의 'API Boundary: Unauthorized Direct API Access'.
    //   그 테스트는 토큰을 싣지 않은 **익명** 요청이었다(주석에도 "APIRequestContext 는 storageState
    //   쿠키를 상속하지 않는다"고 적혀 있었다). 위 3건이 '인증됐지만 권한 없음'을 덮으므로,
    //   남은 축인 '인증 자체가 없음'만 여기로 옮겨 보안 계약을 한 파일에서 읽히게 한다.
    test('anonymous request is rejected on admin API (authentication required)', async ({ request }) => {
        const res = await request.get(`${API}/admin/system/users/webmaster`);
        expect([401, 403], `admin 엔드포인트가 미인증에 노출됨 (status ${res.status()})`).toContain(res.status());
    });
});

// ───────────────── E4: 미들웨어 /admin 경로 정책 (deny-by-default 매트릭스) ─────────────────
//
// [2026-08-10 재작성] 종전 E4 는 민감경로 5건을 **브라우저 페이지 로드**로 하나씩 확인했고,
//   같은 계약을 03-board-master-management(`Access Denied for Regular User`)·
//   04-quality-resilience(`Denied Admin Access for Regular User`)·
//   22-deep-security-guard(`Access Denied for Direct User ID Manipulation`)가 각자 다시 검사했다.
//   네 파일이 같은 한 줄(미들웨어 §4)을 서로 모르게 중복 검증하면서, 정작 아래 것들은
//   **한 번도 검증된 적이 없었다**:
//     · USER_ACCESSIBLE_ADMIN_PATHS 5건 중 4건 (특히 로그인 기본 착지점 `/admin/work-hub`)
//     · ADMIN_ONLY_SUBPATHS 3건 중 2건 (`boards/maker`, `templates`)
//     · 대소문자 우회(`/Admin/...`) — middleware 가 toLowerCase() 로 막고 있다고 주석에 적힌 방어
//     · 접두사 오매칭(`/admin/helpdesk` 가 허용경로 `/admin/help` 에 편승하지 못하는가)
//   즉 중복은 많고 커버리지는 비어 있었다. 정책을 **매트릭스 한 곳**으로 모으고 공백을 메운다.
//
// [검증 층위] 이 계약의 집행자는 미들웨어이고 관측 지점은 리다이렉트 응답이다. 그래서 브라우저를
//   띄우지 않고 HTTP 로 직접 묻는다 — 페이지 렌더·하이드레이션·ConsoleGuard 가 개입하지 않아
//   판정이 결정적이고, 경로 1건당 비용이 페이지 로드에서 단순 요청으로 내려간다.
//   브라우저 경로(실제 쿠키가 미들웨어까지 도달하는가)는 아래 카나리아 1건이 따로 지킨다.
//
// ⚠ 이 게이트는 1차 방어(관리자 UI 셸 진입 차단)일 뿐이다. 권한의 authoritative 집행자는
//   백엔드이며 그쪽은 E3 가 검증한다(middleware.ts §4 주석과 정합).
test.describe('Tier 23-E4: Middleware /admin path policy (deny-by-default matrix)', () => {
    // ⚠ storageState 를 지정하지 않는다. Playwright 의 `request` 픽스처는 storageState 를 상속하므로,
    //   지정하면 컨텍스트 쿠키와 아래에서 명시한 Cookie 헤더가 섞여 '어느 토큰으로 판정됐는지'가
    //   불분명해진다. 이 매트릭스는 실어 보낸 토큰만 작용해야 성립한다.
    let userToken = '';
    test.beforeAll(() => {
        userToken = readAccessToken(USER_AUTH);
    });

    /** 비관리자 토큰으로 경로에 진입했을 때 미들웨어의 판정을 리다이렉트 응답으로 관측한다. */
    async function verdictAsUser(request: APIRequestContext, targetPath: string) {
        const res = await request.get(targetPath, {
            headers: { Cookie: `accessToken=${userToken}` },
            maxRedirects: 0,
        });
        return { status: res.status(), location: res.headers()['location'] ?? '' };
    }

    test.beforeEach(() => {
        expect(userToken, 'user.json accessToken 로드 실패 (auth.setup 미실행?)').toBeTruthy();
    });

    // ── 차단되어야 하는 경로 ────────────────────────────────────────────────
    // 앞의 6건은 관리 콘솔(기본 차단), 뒤의 3건은 허용 경로 안쪽에서 다시 도려낸 carve-out 이다.
    // carve-out 은 ADMIN_ONLY_SUBPATHS 전량이다 — 목록에서 하나가 빠지면 여기서 red 가 된다.
    const deniedPaths = [
        '/admin/system/menus',
        '/admin/system/audit',
        '/admin/user/manage',
        '/admin/security/authority',
        '/admin/stats',
        '/admin/workflow',
        '/admin/community/boards/master',   // carve-out: 게시판 마스터 콘솔
        '/admin/community/boards/maker',    // carve-out: 게시판 생성 마법사
        '/admin/community/templates',       // carve-out: 템플릿 관리
    ];

    for (const p of deniedPaths) {
        test(`non-admin is denied on ${p}`, async ({ request }) => {
            const { status, location } = await verdictAsUser(request, p);
            expect([302, 307], `리다이렉트가 아님 (status ${status})`).toContain(status);
            expect(location, `비관리자에게 ${p} 가 열렸다`).toContain('auth_error=unauthorized');
        });
    }

    // ── 열려 있어야 하는 경로(과잉차단 회귀 방어) ───────────────────────────
    // USER_ACCESSIBLE_ADMIN_PATHS 전량. 여기서 하나라도 막히면 일반 사용자는 그 화면을 잃는다.
    // 특히 `/admin/work-hub` 는 로그인 기본 착지점이라, 막히는 순간 로그인 직후가 곧바로 깨진다.
    const allowedPaths = [
        '/admin/work-hub',
        '/admin/collaboration',
        '/admin/help',
        '/admin/community',
        '/admin/survey/polls/participate',
    ];

    for (const p of allowedPaths) {
        test(`non-admin is allowed on ${p}`, async ({ request }) => {
            const { location } = await verdictAsUser(request, p);
            expect(location, `허용 경로 ${p} 가 비관리자에게 차단됐다 (과잉차단 회귀)`)
                .not.toContain('auth_error=unauthorized');
        });
    }

    // ── 우회 시도 ───────────────────────────────────────────────────────────
    test('대소문자를 바꾼 경로로 게이트를 우회할 수 없다', async ({ request }) => {
        // middleware 는 pathname 을 toLowerCase() 한 뒤 비교한다. 그 정규화가 사라지면
        // `/Admin/system/menus` 가 '/admin' 접두사에 걸리지 않아 게이트를 통째로 빠져나간다.
        for (const p of ['/Admin/system/menus', '/ADMIN/USER/MANAGE']) {
            const { location } = await verdictAsUser(request, p);
            expect(location, `대소문자 우회가 통과됨: ${p}`).toContain('auth_error=unauthorized');
        }
    });

    test('허용 경로의 접두사에 편승할 수 없다', async ({ request }) => {
        // matchesPrefix 는 세그먼트 경계까지 맞춘다. 단순 startsWith 로 되돌아가면
        // `/admin/helpdesk` 가 허용 경로 `/admin/help` 에 편승해 열린다.
        const { location } = await verdictAsUser(request, '/admin/helpdesk');
        expect(location, '/admin/helpdesk 가 /admin/help 허용에 편승했다').toContain('auth_error=unauthorized');
    });

    test('쿼리스트링으로 경로 판정을 흐릴 수 없다', async ({ request }) => {
        // 판정은 pathname 만 본다 — 쿼리는 경로를 바꾸지 못한다.
        // (22-deep-security-guard 의 'Access Denied for Direct User ID Manipulation' 을 흡수한 케이스.
        //  그 테스트는 이름이 IDOR 였지만 실제로 검증하던 것은 이 경로 RBAC 이었다.)
        const { location } = await verdictAsUser(request, '/admin/user/manage?userId=webmaster');
        expect(location).toContain('auth_error=unauthorized');
    });

    test('토큰이 없으면 권한거부가 아니라 로그인으로 보낸다', async ({ request }) => {
        // 인증 실패(/login)와 권한 부족(/?auth_error)은 구분되어야 진단이 성립한다(middleware §3/§4).
        const res = await request.get('/admin/work-hub', { maxRedirects: 0 });
        expect([302, 307]).toContain(res.status());
        const location = res.headers()['location'] ?? '';
        expect(location, '미인증 요청이 로그인으로 가지 않았다').toContain('/login');
        expect(location).not.toContain('auth_error=unauthorized');
    });
});

// ── 브라우저 카나리아: 실제 브라우저 쿠키가 미들웨어까지 도달하는가 ────────────────
// 위 매트릭스는 Cookie 헤더를 직접 실어 미들웨어 '판정 로직'을 검증한다. 그 로직이 옳아도
// 브라우저가 쿠키를 싣지 못하면(SameSite·path·HttpOnly 설정 사고) 사용자는 여전히 튕긴다.
// 배선 자체는 층이 다르므로 최소 1건을 실제 브라우저로 남긴다.
test.describe('Tier 23-E4c: Browser canary for cookie→middleware wiring', () => {
    test.use({ storageState: USER_AUTH });

    test('실제 브라우저 세션의 일반 사용자는 관리 콘솔에서 차단되고 허용 경로는 통과한다', async ({ page }) => {
        await page.goto('/admin/community/boards/master');
        await expect(page).toHaveURL(/auth_error=unauthorized/, { timeout: 15000 });

        await page.goto('/admin/collaboration');
        await expect(page).not.toHaveURL(/auth_error=unauthorized/);
    });
});

// ───────────── E5: Zero-Trust Origin 가드 (상태변경 /api 요청) ─────────────
// middleware.ts 최상단은 POST/PUT/DELETE/PATCH + `/api` 요청의 Origin 헤더를 검사해
// 신뢰할 수 없는 출처를 403(INVALID_ORIGIN)으로 끊는다. 이 방어에는 E2E 가 하나도 없었다.
//
// 특히 그 코드에는 **이미 한 번 고쳐진 우회**가 있다 — 종전 구현은 부분문자열(includes) 비교라
// `https://localhost.attacker.com` 같은 **접미사 도메인**이 통과했다. 지금은 URL 을 파싱해
// hostname 을 정확히 비교하지만, 그 수정을 지키는 회귀 방어가 없어 되돌아가도 알 수 없었다.
test.describe('Tier 23-E5: Zero-trust Origin guard', () => {
    // 부작용이 없는 상태변경 엔드포인트를 쓴다. 로그아웃 라우트는 쿠키 없이 호출해도
    // fail-safe 로 200 을 돌려주므로(logout/route.ts catch 절) 세션·감사로그를 오염시키지 않는다.
    const STATE_CHANGING_PATH = '/api/auth/logout';
    const SAME_ORIGIN = process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3001';

    test('접미사 도메인 Origin 은 403 INVALID_ORIGIN 으로 거부된다', async ({ request }) => {
        const res = await request.post(STATE_CHANGING_PATH, {
            headers: { Origin: 'http://localhost.attacker.com' },
            maxRedirects: 0,
        });
        expect(res.status(), '접미사 도메인 Origin 이 통과됨 (includes 비교로 회귀)').toBe(403);
        expect((await res.json())?.code).toBe('INVALID_ORIGIN');
    });

    test('무관한 외부 Origin 은 403 INVALID_ORIGIN 으로 거부된다', async ({ request }) => {
        const res = await request.post(STATE_CHANGING_PATH, {
            headers: { Origin: 'https://evil.example.com' },
            maxRedirects: 0,
        });
        expect(res.status()).toBe(403);
        expect((await res.json())?.code).toBe('INVALID_ORIGIN');
    });

    test('동일 출처 Origin 은 통과한다 (과잉차단 회귀 방어)', async ({ request }) => {
        // 가드가 너무 조여 정상 요청까지 막으면 앱 전체의 상태변경이 죽는다 — 양방향으로 고정한다.
        const res = await request.post(STATE_CHANGING_PATH, {
            headers: { Origin: SAME_ORIGIN },
            maxRedirects: 0,
        });
        expect(res.status(), '동일 출처 요청이 Origin 가드에 막혔다').not.toBe(403);
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
