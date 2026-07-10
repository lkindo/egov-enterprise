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
const API = 'http://localhost:8080/api/v1';

function readAccessToken(authFile: string): string {
    const data = JSON.parse(fs.readFileSync(authFile, 'utf-8'));
    return data.cookies.find((c: { name: string; value: string }) => c.name === 'accessToken')?.value ?? '';
}

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

    test('[documented contract] non-sensitive admin route is NOT redirected by middleware', async ({ page }) => {
        // 미들웨어 민감목록에 없는 /admin/community 는 리다이렉트되지 않고 통과한다(백엔드 RBAC에 위임).
        // 이 테스트는 현재의 프론트/백엔드 RBAC 분담 계약을 고정한다 — 동작이 바뀌면 의도적으로 재검토할 것.
        await page.goto('/admin/community/boards/master');
        await expect(page).not.toHaveURL(/auth_error=unauthorized/);
    });
});

// ───────────── E1: 토큰 재발급(silent refresh) — 런타임 쿠키 조작 검증 필요로 fixme ─────────────
test.describe('Tier 23-E1: Access-token reissue / silent refresh', () => {
    test.use({ storageState: 'playwright/.auth/admin.json' });

    // 인터셉터 계약(src/lib/api/client.ts): 클라이언트 API 401 → POST /auth/reissue → 새 accessToken.
    // reissue 실패 → window.location = /login?expired=true. 미들웨어는 accessToken '존재'만 확인하므로
    // 만료 시나리오는 쿠키를 '무효값'으로 덮어써야 한다(삭제하면 미들웨어가 먼저 /login으로 보냄).
    test.fixme('expired access token → 자동 reissue 200 → 세션 유지', async ({ page, context }) => {
        // 1) refreshToken 유지, accessToken을 무효값으로 교체(context.addCookies)
        // 2) 클라이언트 fetch가 있는 보호 페이지로 이동(예: /admin/user/manage)
        // 3) await page.waitForResponse(r => r.url().includes('/auth/reissue') && r.status() === 200)
        // 4) await expect(page).not.toHaveURL(/\/login/)
        void page; void context;
    });

    test.fixme('invalid refresh token → reissue 실패 → /login?expired=true 리다이렉트', async ({ page, context }) => {
        // accessToken·refreshToken 모두 무효 → 401 → reissue 401 → window.location = /login?expired=true
        // await expect(page).toHaveURL(/\/login\?expired=true/)
        void page; void context;
    });
});

// ──────────────── E11: 접근성(a11y) — /login (color-contrast 포함, 미비활성) ────────────────
test.describe('Tier 23-E11: Accessibility (login page, strict)', () => {
    test('login page has no axe violations (color-contrast included)', async ({ page }) => {
        await page.goto('/login');
        // 04-quality의 a11y는 color-contrast/heading-order를 비활성했으나, 공개 진입점 /login은 엄격히 검사한다.
        const results = await new AxeBuilder({ page }).analyze();
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
