import { test, expect } from './fixtures/base-test';

test.describe('Tier 20: Common Security & UI Validation', () => {
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
            specScope: '20-common-security-validation.spec.ts :: Session Integrity: Handling Token Clearance',
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
            sessionLossProbe('E2E-SESSION-CLEARED-NOTIFICATIONS-401',
                /\/api\/v1\/notifications(?:\?|$)/, 'GET', 3,
                '마운트된 알림 폴링이 세션 소실을 발견하는 지점이다.'),
            sessionLossProbe('E2E-SESSION-CLEARED-UNREAD-COUNT-401',
                /\/api\/v1\/notifications\/unread-count(?:\?|$)/, 'GET', 3,
                '알림 폴링과 같은 회차에 나가는 미읽음 수 조회다.'),
            sessionLossProbe('E2E-SESSION-CLEARED-REISSUE-401',
                /\/api\/auth\/reissue(?:\?|$)/, 'POST', 2,
                'refreshToken 도 지워졌으므로 설계된 재발급 시도가 정상 실패한다.'),
            sessionLossProbe('E2E-SESSION-CLEARED-ME-401',
                /\/api\/v1\/auth\/me(?:\?|$)/, 'GET', 2,
                '재발급 실패로 도착한 로그인 화면의 세션 확인 요청이다.'),
            // SockJS 는 WebSocket 이 막히면 xhr_streaming/xhr_send 로 폴백해 계속 재시도한다.
            // 쿠키가 지워졌으므로 그 전송도 401 이며, 이는 콘솔 채널 항목과 같은 사슬의
            // **응답 채널** 표현이다. 재시도 횟수가 타이밍에 좌우돼 간헐적으로만 관측된다
            // (CI run 32283793284 shard 2 에서 이 항목 부재로 red).
            sessionLossProbe('E2E-SESSION-CLEARED-SOCKJS-401',
                /\/ws\//, 'POST', 5,
                '세션 소실 후 SockJS 폴백 전송이 인증 거부되는 지점이다.'),
            {
                id: 'E2E-SESSION-CLEARED-WS-ERROR',
                specScope: '20-common-security-validation.spec.ts :: Session Integrity: Handling Token Clearance',
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
                specScope: '20-common-security-validation.spec.ts :: Session Integrity: Handling Token Clearance',
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
        await expect(page.getByRole('heading', { name: '엔터프라이즈', exact: true })).toBeVisible();
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
