import { APIRequestContext } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { expect,test } from '../fixtures/api-test';
const USER_AUTH = path.join(__dirname, '..', '..', 'playwright', '.auth', 'user.json');
// [2026-07-28 정정] 백엔드 주소를 하드코딩하고 있었다. auth.setup.ts·cleanup-db.ts 는 이미
//   `process.env.NEXT_PUBLIC_API_URL || 기본값` 패턴을 쓰는데 이 파일만 예외였고, 그 결과
//   백엔드를 다른 포트에 띄우면 **그 포트를 점유한 무관한 서비스로 요청이 새어** RBAC 단언이
//   거짓 통과/거짓 실패한다(실측: 8080 을 다른 앱이 물고 있을 때 모든 경로가 200 을 돌려줘
//   "admin 엔드포인트가 비관리자에게 노출됨" 으로 3건이 red 가 됐다).
//   보안 단언이 환경에 따라 뒤집히는 것은 게이트로서 치명적이므로 저장소 표준 패턴에 맞춘다.
const API = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1').replace(/\/$/, '');
function readCookieValue(authFile: string, name: string): string {
    const data = JSON.parse(fs.readFileSync(authFile, 'utf-8'));
    return data.cookies.find((c: {
        name: string;
        value: string;
    }) => c.name === name)?.value ?? '';
}
function readAccessToken(authFile: string): string {
    return readCookieValue(authFile, 'accessToken');
}
// ─────────────── E3: RBAC negative — 로그인한 '일반 사용자'가 admin API에 금지되는지 ───────────────
test.describe('RBAC negative at API (authenticated non-admin forbidden)', () => {
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
//     · 일반 사용자에게 열려 있어야 하는 화면(`/admin/work-hub` — 당시 로그인 기본 착지점이었다.
//       2026-09-12 DEC-OPS-083 으로 착지는 `/` 로 옮겼고, 이 화면은 인증 전용 표본으로 남는다)
//     · 커뮤니티 안의 개별 관리 화면(`boards/maker`, `templates`)
//     · 대소문자 우회(`/Admin/...`) — middleware 가 toLowerCase() 로 막고 있다고 주석에 적힌 방어
//     · 접두사 오매칭(`/admin/helpdesk` 가 허용경로 `/admin/help` 에 편승하지 못하는가)
//   즉 중복은 많고 커버리지는 비어 있었다. 정책을 **매트릭스 한 곳**으로 모으고 공백을 메운다.
//   현재는 PAGE_PERMISSIONS의 개별 페이지 등록과 서버의 현재 기능권한으로 판단한다.
//   상위 화면의 인증 전용 선언([])은 등록되지 않은 하위 경로를 허용하지 않는다.
//
// [검증 층위] 이 계약의 집행자는 미들웨어이고 관측 지점은 리다이렉트 응답이다. 그래서 브라우저를
//   띄우지 않고 HTTP 로 직접 묻는다 — 페이지 렌더·하이드레이션·ConsoleGuard 가 개입하지 않아
//   판정이 결정적이고, 경로 1건당 비용이 페이지 로드에서 단순 요청으로 내려간다.
//   브라우저 경로(실제 쿠키가 미들웨어까지 도달하는가)는 아래 카나리아 1건이 따로 지킨다.
//
// ⚠ 이 게이트는 화면 진입을 검증한다. 자료 조회·변경의 최종 집행자는 백엔드이며,
//   기능권한과 자료별 조건은 E3 등 API 검증이 담당한다.
test.describe('Middleware /admin path policy (deny-by-default matrix)', () => {
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
    // 일반 사용자 기본 그룹에 없는 기능권한을 요구하는 개별 관리 화면이다.
    // 커뮤니티 상위 화면이 열려 있어도 게시판·템플릿 관리 화면은 각자의 권한이 필요하다.
    //
    // ⚠ [2026-08-10 CI 실증] 이 목록에는 **next.config 의 redirects() 에 등록된 경로를 넣지 않는다.**
    //   Next 의 파이프라인은 `redirects()` 를 **미들웨어보다 먼저** 실행하므로, 설정 리다이렉트가
    //   걸린 경로는 미들웨어 인증 게이트에 **도달조차 하지 않는다**.
    //   첫 CI 에서 `/admin/system/audit` 이 정확히 이 이유로 실패했다:
    //     Expected substring: "auth_error=unauthorized"
    //     Received string:    "/admin/system/monitoring/hub?tab=system"
    //   (보안 구멍은 아니다 — 목적지가 `/admin/system` 하위라 브라우저가 따라간 2차 홉에서 차단된다.
    //    삭제된 04 의 테스트가 통과했던 것은 `page.goto()` 가 리다이렉트를 따라가 최종 URL 만 봤기 때문이다.)
    //   → 여기에는 **실제로 존재하는 종착 경로**만 넣고, 레거시 별칭은 아래 별도 테스트가 사슬로 검증한다.
    const deniedPaths = [
        '/admin/system/menus',
        '/admin/system/monitoring/hub', // 종전 `/admin/system/audit` 의 실제 종착지
        '/admin/user/manage',
        '/admin/security/authority',
        '/admin/stats',
        '/admin/workflow',
        '/admin/community/boards/master', // 게시판 마스터 콘솔
        '/admin/community/boards/maker', // 게시판 생성 마법사
        '/admin/community/templates', // 템플릿 관리
    ];
    for (const p of deniedPaths) {
        test(`non-admin is denied on ${p}`, async ({ request }) => {
            const { status, location } = await verdictAsUser(request, p);
            expect([302, 307], `리다이렉트가 아님 (status ${status})`).toContain(status);
            expect(location, `비관리자에게 ${p} 가 열렸다`).toContain('auth_error=unauthorized');
        });
    }
    // ── 열려 있어야 하는 경로(과잉차단 회귀 방어) ───────────────────────────
    // PAGE_PERMISSIONS에 인증 전용([])으로 등록된 대표 화면이다. 하위 경로로 권한을 상속하지 않는다.
    // [2026-09-12] 종전 주석은 `/admin/work-hub` 를 "로그인 기본 착지점" 이라 설명했으나 착지는 `/` 로
    // 옮겼다(DEC-OPS-083 — 워크허브는 demo 소유라 파생 제품에서 404 였다). 이 목록에 남는 이유는
    // 여전히 **인증 전용으로 등록된 대표 화면**이라 과잉차단 회귀를 재는 표본이기 때문이다.
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
        // 비슷한 이름뿐 아니라 인증 전용 화면 아래의 미등록 경로도 개별 페이지 등록을 우회할 수 없다.
        for (const p of ['/admin/helpdesk', '/admin/help/faq/not-registered', '/admin/collaboration/not-registered', '/admin/work-hub/not-registered']) {
            const { status, location } = await verdictAsUser(request, p);
            expect([302, 307], `미등록 경로가 권한 거부로 리다이렉트되지 않음: ${p} (status ${status})`).toContain(status);
            expect(location, `미등록 경로 ${p} 가 상위 화면 허용에 편승했다`).toContain('auth_error=unauthorized');
        }
    });
    test('쿼리스트링으로 경로 판정을 흐릴 수 없다', async ({ request }) => {
        // 판정은 pathname 만 본다 — 쿼리는 경로를 바꾸지 못한다.
        // (22-deep-security-guard 의 'Access Denied for Direct User ID Manipulation' 을 흡수한 케이스.
        //  그 테스트는 이름이 IDOR 였지만 실제로 검증하던 것은 이 경로 RBAC 이었다.)
        const { location } = await verdictAsUser(request, '/admin/user/manage?userId=webmaster');
        expect(location).toContain('auth_error=unauthorized');
    });
    // ⚠ 레거시 별칭의 **다중 홉** 검증은 이 describe 에 둘 수 없다 — 아래 E4c(브라우저)가 소유한다.
    //   이유(2026-08-10 스텁 서버로 실증): Playwright 의 APIRequestContext 는 **수동으로 지정한
    //   `Cookie` 헤더를 리다이렉트 다음 홉으로 전달하지 않는다.**
    //       /hop1  cookie=accessToken=TESTVALUE
    //       /hop2  cookie=(없음)
    //   그래서 여기서 체인을 따라가면 2차 홉이 **무토큰으로 도착**해, 미들웨어가 권한거부(/?auth_error)가
    //   아니라 인증실패(/login?redirect=...) 로 판정한다. 실제 CI 실패가 정확히 그 모습이었다:
    //       Received: "http://localhost:3001/login?redirect=%2Fadmin%2Fsystem%2Fmonitoring%2Fhub"
    //   즉 앱이 아니라 **검증 수단이 세션을 잃은 것**이다. 쿠키 저장소를 가진 브라우저로 검증해야 한다.
    test('토큰이 없으면 권한거부가 아니라 로그인으로 보낸다', async ({ request }) => {
        // 인증 실패(/login)와 권한 부족(/?auth_error)은 구분되어야 진단이 성립한다(middleware §3/§4).
        const res = await request.get('/admin/work-hub', { maxRedirects: 0 });
        expect([302, 307]).toContain(res.status());
        const location = res.headers()['location'] ?? '';
        expect(location, '미인증 요청이 로그인으로 가지 않았다').toContain('/login');
        expect(location).not.toContain('auth_error=unauthorized');
    });
});
