import { createVisualAdmin } from '../fixtures/visual-admin';
import fs from 'fs';
import path from 'path';
import { expect, test } from '../fixtures/api-test';
const ADMIN_AUTH = path.join(__dirname, '..', '..', 'playwright', '.auth', 'admin.json');
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
// ───────────────────────── E2: 로그인 실패(잘못된 자격증명) ─────────────────────────
test.describe('Login failure (negative auth)', () => {
    /**
     * 계정 잠금(lockout) — 종전 `test.fixme` 를 실제 검증으로 대체한다(2026-08-11).
     *
     * [정책 실측] EgovAuthenticationProvider:
     *   · `nuri.security.login.max-failures` (기본 **5**) 에 **도달**하면 lock()
     *   · `nuri.security.login.lock-minutes` (기본 15) 경과 후 다음 시도에서 자동 해제
     *   · 잠긴 계정은 validateAccountStatus 가 AccountStatusException 으로 막는다
     *
     * ⚠ **공용 계정으로 하면 안 된다.** webmaster/TEST1 을 잠그면 15분 동안 그 계정을 쓰는
     *   모든 테스트가 무너진다 — 잠금 테스트가 스위트 전체를 인질로 잡는 구조가 된다.
     *   그래서 **일회용 계정을 만들어 잠그고 회수**한다(23-E6 IDOR 와 같은 방식).
     *
     * [무엇을 단언하는가] 잠금 여부를 오류 코드로 판정하지 않는다 — 잘못된 비밀번호와 잠금이
     *   같은 401 로 나올 수 있기 때문이다. 대신 **올바른 비밀번호로도 더 이상 로그인되지 않는다**
     *   를 본다. 이것은 코드에 의존하지 않는 명백한 잠금의 증거다.
     *   그 전에 **같은 자격으로 한 번은 성공**하는 것을 먼저 확인한다 — 그래야 마지막 실패가
     *   '잠금 때문' 임이 성립한다(계정 자체가 잘못돼 실패하는 경우와 구분된다).
     */
    test('연속 실패가 임계에 도달하면 올바른 비밀번호로도 로그인되지 않는다 (계정 잠금)', async ({ request }) => {
        const adminToken = readAccessToken(ADMIN_AUTH);
        expect(adminToken, 'admin.json accessToken 로드 실패').toBeTruthy();
        const asAdmin = { Authorization: `Bearer ${adminToken}` };
        const stamp = Date.now().toString().slice(-8);
        const victimId = `e2e_lock_${stamp}`; // cleanup-db 의 'e2e_' 규약과 정합
        const victimPw = 'E2eLock1!'; // UserDto.pswd 의 @Pattern 충족
        const MAX_FAILURES = 5; // 위 정책 기본값
        const login = (password: string) => request.post(`${API}/auth/login`, { data: { userId: victimId, password } });
        let created = false;
        try {
            const mk = await request.post(`${API}/admin/system/users`, {
                headers: asAdmin,
                data: { userId: victimId, pswd: victimPw, userNm: 'E2E Lock Target', role: 'USER' },
            });
            expect(mk.ok(), `잠금 대상 계정 생성 실패: ${mk.status()}`).toBeTruthy();
            created = true;
            // ① 기준선 — 이 자격으로 원래는 로그인된다.
            //    (이 성공이 lckCnt 를 0 으로 되돌리므로 아래 카운트도 깨끗하게 시작한다.)
            const baseline = await login(victimPw);
            expect(baseline.ok(), '잠기기 전에는 정상 로그인되어야 한다 — 아니면 이후 실패가 잠금 증거가 아니다')
                .toBeTruthy();
            // ② 임계까지 연속 실패
            for (let i = 1; i <= MAX_FAILURES; i++) {
                const bad = await login(`wrong-${i}-Zz9!`);
                expect(bad.ok(), `${i}번째 잘못된 비밀번호가 로그인에 성공했다`).toBeFalsy();
            }
            // ③ 올바른 비밀번호로도 막혀야 한다 = 잠금이 실제로 발동했다.
            const afterLock = await login(victimPw);
            expect(afterLock.ok(), `연속 실패 ${MAX_FAILURES}회 뒤에도 올바른 비밀번호로 로그인됐다 — 계정 잠금이 발동하지 않는다`).toBeFalsy();
        }
        finally {
            if (created) {
                await request.delete(`${API}/admin/system/users/${victimId}`, { headers: asAdmin });
            }
        }
    });
});
// ─────────── E7: 토큰 재발급(/api/auth/reissue) — 세션 연장 경로 ───────────
//
// [2026-08-11 신설] 이 경로는 **보안 경로인데 E2E 가 0 건**이었다.
//   client.ts 인터셉터가 401 을 만나면 이 Route Handler 를 불러 세션을 잇는다. 즉 사용자가
//   작업 중 로그아웃되지 않는 유일한 장치이고, 동시에 **토큰을 새로 발행하는 지점**이다.
//   단위 테스트는 있었지만 실제 Route Handler → 백엔드 → 쿠키 재설정 사슬은 검증된 적이 없다.
//
// [무엇을 고정하는가] 이 라우트에는 **의도된 하드닝**이 들어 있고(reissue/route.ts 주석),
//   그것이 되돌아가면 조용히 보안이 약해진다:
//     · 새 accessToken 을 **응답 바디로 돌려주지 않는다** — JS 메모리 노출 차단.
//       인터셉터는 200/success 를 신호로만 쓰고 실제 토큰은 HttpOnly 쿠키로만 전달된다.
//     · 그 쿠키는 **HttpOnly** 여야 한다.
//   "재발급이 된다" 뿐 아니라 **"어떻게 전달되는가"** 까지 단언하는 이유다.
test.describe('Token reissue', () => {
    // storageState 를 지정하지 않는다 — 쿠키를 명시적으로 실어 '무엇으로 재발급됐는지' 를 분명히 한다.
    const REISSUE = '/api/auth/reissue';
    test('유효한 refreshToken 으로 재발급되며, 새 토큰은 바디가 아니라 HttpOnly 쿠키로만 전달된다', async ({ request, playwright, baseURL }) => {
        // Refresh는 사용자당 하나이므로 공유 계정의 로그인·로그아웃과 겹치지 않는 주체를 쓴다.
        const fixtureRequest = await playwright.request.newContext({
            baseURL, storageState: { cookies: [], origins: [] },
        });
        let actor: Awaited<ReturnType<typeof createVisualAdmin>> | undefined;
        try {
            actor = await createVisualAdmin(fixtureRequest, baseURL!);
            const refreshToken = actor.refreshToken;
            expect(refreshToken, '일회용 관리자의 로그인에서 refreshToken을 발급해야 한다').toBeTruthy();
            const res = await request.post(REISSUE, {
                headers: { Cookie: `refreshToken=${refreshToken}` },
                maxRedirects: 0,
            });
            expect(res.ok(), `재발급 실패: ${res.status()}`).toBeTruthy();
            // ① 바디에 토큰이 실리면 안 된다(의도된 하드닝의 회귀 방어).
            const body = await res.json();
            expect(body?.success).toBe(true);
            expect(body?.data?.accessToken, '재발급 토큰이 응답 바디로 노출됐다 — HttpOnly 쿠키 전용 설계가 되돌아갔다').toBeFalsy();
            // ② accessToken 이 HttpOnly·SameSite=Strict 쿠키로 재설정돼야 한다.
            //    Playwright 는 다중 Set-Cookie 를 개행으로 합쳐 준다.
            const setCookie = res.headers()['set-cookie'] ?? '';
            const accessCookieLine = setCookie
                .split('\n')
                .find((line) => line.trim().startsWith('accessToken='));
            expect(accessCookieLine, 'accessToken 쿠키가 재설정되지 않았다').toBeTruthy();
            expect(accessCookieLine, 'accessToken 이 HttpOnly 가 아니다 — JS 로 읽히면 탈취 표면이 열린다')
                .toMatch(/HttpOnly/i);
            expect(accessCookieLine, 'accessToken 이 SameSite=Strict 가 아니다')
                .toMatch(/SameSite=Strict/i);
            if (process.env.CI === 'true') {
                expect(accessCookieLine, 'production CI의 재발급 accessToken 에 Secure가 없다')
                    .toMatch(/(?:^|;)\s*Secure(?:;|$)/i);
            }
            // ③ 발급된 토큰이 **실제로 쓸 수 있어야** 한다 — 여기까지 봐야 "재발급됐다"가 의미를 갖는다.
            //    (200 만 보고 통과시키면 빈 토큰을 심어도 그린이다.)
            const newToken = /accessToken=([^;]+)/.exec(accessCookieLine ?? '')?.[1] ?? '';
            expect(newToken, '재설정된 accessToken 값이 비어 있다').toBeTruthy();
            const useIt = await request.get('/admin/system/menus', {
                headers: { Cookie: `accessToken=${newToken}` },
                maxRedirects: 0,
            });
            expect(useIt.status(), `재발급 토큰으로 보호 경로에 진입하지 못했다 (status ${useIt.status()})`).toBe(200);
        }
        finally {
            try {
                if (actor)
                    await actor.dispose();
            }
            finally {
                await fixtureRequest.dispose();
            }
        }
    });
    test('refreshToken 없이는 재발급되지 않는다', async ({ request }) => {
        // 자격 없이 세션이 발급되면 그것이 곧 인증 우회다.
        const res = await request.post(REISSUE, { maxRedirects: 0 });
        expect(res.ok(), `자격 없이 토큰이 재발급됐다 (status ${res.status()})`).toBeFalsy();
        const setCookie = res.headers()['set-cookie'] ?? '';
        const issued = setCookie
            .split('\n')
            .some((line) => /^accessToken=.+/.test(line.trim()) && !/accessToken=;/.test(line));
        expect(issued, '실패 응답인데 accessToken 쿠키가 심어졌다').toBe(false);
    });
});
// ───────────── E5: Zero-Trust Origin 가드 (상태변경 /api 요청) ─────────────
// middleware.ts 최상단은 POST/PUT/DELETE/PATCH + `/api` 요청의 Origin 헤더를 검사해
// 신뢰할 수 없는 출처를 403(INVALID_ORIGIN)으로 끊는다. 이 방어에는 E2E 가 하나도 없었다.
//
// 특히 그 코드에는 **이미 한 번 고쳐진 우회**가 있다 — 종전 구현은 부분문자열(includes) 비교라
// `https://localhost.attacker.com` 같은 **접미사 도메인**이 통과했다. 지금은 URL 을 파싱해
// hostname 을 정확히 비교하지만, 그 수정을 지키는 회귀 방어가 없어 되돌아가도 알 수 없었다.
test.describe('Zero-trust Origin guard', () => {
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
        expect(res.status(), '동일 출처 로그아웃 요청은 정상 처리되어야 한다').toBe(200);
    });
});
