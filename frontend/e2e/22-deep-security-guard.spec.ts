import { test, expect } from './fixtures/base-test';
import fs from 'fs';
import path from 'path';

/**
 * [Tier 22] Deep Security Guard: IDOR, XSS, and URL Manipulation
 *
 * 시스템의 보안 경계를 종합적으로 검증합니다.
 * 특히 권한이 없는 사용자가 ID를 조작하여 다른 사용자의 데이터에 접근하는 시나리오(IDOR)와
 * 복합적인 인젝션 공격에 대한 UI/API 방어력을 체크합니다.
 */

/**
 * storageState(admin.json)에서 accessToken 을 꺼낸다.
 * 백엔드 JwtTokenProvider 는 Authorization: Bearer 헤더만 읽고 쿠키는 무시하므로
 * APIRequestContext 에는 토큰을 명시적으로 실어야 인증이 선다. (tier-19/tier-24 와 동일 패턴)
 */
function getAdminBearerToken(): string {
    const authPath = path.resolve('playwright/.auth/admin.json');
    const state = JSON.parse(fs.readFileSync(authPath, 'utf-8'));
    const cookieToken = (state.cookies ?? []).find((c: any) => c.name === 'accessToken')?.value;
    const lsToken = (state.origins?.[0]?.localStorage ?? []).find((l: any) => l.name === 'accessToken')?.value;
    const token = cookieToken ?? lsToken;
    if (!token) {
        throw new Error('[tier-22] admin accessToken 을 playwright/.auth/admin.json 에서 찾을 수 없음 (setup 미실행?)');
    }
    return token;
}

const BOARD_API = '/api/v1/boards';
/** 시딩한 게시글만 지우기 위한 접두사. globalTeardown(cleanup-db.ts)의 'E2E' 스윕과도 정합. */
const PREFIX = 'E2E22_';

test.describe('Tier 22: Deep Security Guard', () => {
    
    test.describe('IDOR (Insecure Direct Object Reference) Protection', () => {
        // Use a regular user session to try and access admin-only data
        test.use({ storageState: 'playwright/.auth/user.json' });

        test('Access Denied for Direct User ID Manipulation', async ({ page, consoleGuard }) => {
            consoleGuard.addIgnorePattern(/HTTP 401/i);
            consoleGuard.addIgnorePattern(/401 \(Unauthorized\)/i);

            // Attempt to access a specific user's edit page (webmaster) as a regular user
            const targetUrl = '/admin/user/manage?userId=webmaster';
            console.log(`>>> Attempting unauthorized access to: ${targetUrl}`);
            
            await page.goto(targetUrl);
            
            // Should be redirected or show unauthorized
            await expect(page).not.toHaveURL(/.*userId=webmaster/, { timeout: 10000 });
            
            const url = page.url();
            if (url.includes('auth_error=unauthorized') || url === 'http://localhost:3001/') {
                console.log('>>> IDOR access correctly blocked (Redirected)');
            } else {
                const bodyText = await page.innerText('body');
                expect(bodyText).toMatch(/권한|접근|Deny|Unauthorized|Forbidden/i);
                console.log('>>> IDOR access correctly blocked (Error Message)');
            }
        });

        test('API Boundary: Unauthorized Direct API Access', async ({ request }) => {
            console.log('>>> Attempting unauthorized API call to admin system users');
            // This assumes the user session (from storageState) is passed automatically if using 'request' from test args
            // However, Playwright's 'request' doesn't automatically use storageState cookies for APIRequestContext 
            // unless configured in playwright.config.ts or passed manually.
            // In our project, it's safer to check if the API returns 403.
            
            const response = await request.get('/api/v1/admin/system/users/webmaster');
            // Status should be 401 or 403
            expect([401, 403]).toContain(response.status());
            console.log(`>>> API Access Blocked with status: ${response.status()}`);
        });
    });

    test.describe('Advanced XSS & Payload Sanitization', () => {
        test.use({ storageState: 'playwright/.auth/admin.json' });

        test('XSS Sanitization: Complex Payloads in Board Comments', async ({ page, request }) => {
            const bbsId = 'BBSMSTR_AAAAAAAAAAAA';
            const auth = { Authorization: `Bearer ${getAdminBearerToken()}` };

            // [하드코딩 ID 제거] 과거에는 pstId '1108'(기존 게시글)에 의존했다. 그 행이 사라지면
            // 상세 페이지가 비어 댓글 입력창을 못 찾고 테스트가 무의미해지거나 실패했다.
            // tier-24 의 'API 로 시딩 → 사용 → finally 에서 삭제' 패턴을 그대로 따른다.
            const createRes = await request.post(`${BOARD_API}/posts`, {
                headers: auth,
                data: {
                    bbsId,
                    pstTtl: `${PREFIX}XSS_Target_${Date.now()}`,
                    pstCn: 'XSS 새니타이제이션 검증 전용 임시 게시글',
                },
            });
            expect(createRes.ok(), 'XSS 검증용 게시글 시딩이 성공해야 한다').toBeTruthy();
            const pstId = (await createRes.json()).data as string;
            expect(pstId, '서버가 채번한 게시글 ID 가 반환되어야 한다').toBeTruthy();

            // [E2E 감사 A2] XSS payload가 실행되면 alert() → dialog 이벤트가 발생한다.
            // dialog가 한 번이라도 뜨면 즉시 실패 처리한다(과거에는 무단언 console.log만 있어 취약해도 그린이었음).
            let xssDialogFired = false;
            page.on('dialog', async (dialog) => {
                xssDialogFired = true;
                console.error(`🚨 [XSS EXECUTED] Unexpected script dialog: ${dialog.message()}`);
                await dialog.dismiss();
            });

            try {
                await page.goto(`/admin/community/boards/detail?bbsId=${bbsId}&pstId=${pstId}`);

                // 실제 댓글 입력 필드는 <Textarea name="ansCn"> (과거 셀렉터 'commentCn'는 매칭 실패 →
                // if(isVisible) 가드가 항상 false가 되어 테스트가 조용히 통과하던 근본 원인이었음)
                const commentInput = page.locator('textarea[name="ansCn"]').first();
                await expect(commentInput).toBeVisible({ timeout: 15000 }); // 없으면 실패(무단언 통과 차단)

                const payloads = [
                    "<img src=x onerror=alert('XSS')>",
                    "<svg/onload=alert('XSS')>",
                    "<details open ontoggle=alert('XSS')>",
                ];

                for (const payload of payloads) {
                    console.log(`>>> Testing Payload: ${payload}`);
                    await commentInput.fill(payload);
                    await page.getByRole('button', { name: /Commit Response|등록/i }).click();

                    // 페이로드가 '텍스트'로 이스케이프 렌더링되어야 한다(React {value}는 자동 이스케이프).
                    await expect(
                        page.locator('p.whitespace-pre-wrap').filter({ hasText: payload }).first()
                    ).toBeVisible({ timeout: 10000 });

                    // 주입된 '라이브' DOM 노드가 실제로 생성되지 않아야 한다.
                    await expect(page.locator('img[onerror], svg[onload], details[ontoggle]')).toHaveCount(0);

                    await commentInput.fill('');
                }

                // 저장(stored) 경로 재검증: 새로고침 후에도 스크립트가 실행되지 않아야 함.
                await page.reload();
                await expect(page.locator('p.whitespace-pre-wrap').first()).toBeVisible({ timeout: 10000 });

                expect(xssDialogFired, 'XSS payload가 스크립트 dialog를 발생시킴 — 새니타이제이션 실패').toBe(false);
            } finally {
                // 정리. deletePost 는 논리 삭제(use_yn='N')이며 댓글은 함께 지워지지 않는다 —
                // 남는 댓글은 이 임시 게시글에만 매달리므로 실 데이터를 오염시키지 않는다.
                await request.delete(`${BOARD_API}/${bbsId}/posts/${pstId}`, { headers: auth });
            }
        });
    });

    test.describe('URL Integrity & Navigation Guards', () => {
        test.use({ storageState: 'playwright/.auth/admin.json' });

        test('Handling Malformed UUID/IDs in URLs', async ({ page, consoleGuard }) => {
            // [E2E 감사] 오염된 ID로 인한 '예상된' 백엔드 4xx만 해당 요청 URL 한정으로 좁게 화이트리스트.
            // 광역 /not found|404|invalid|error/i 무시는 제거 — React 런타임 크래시는 반드시 실패해야 하므로.
            consoleGuard.addIgnorePattern(/INVALID_ID|pstId=999999|etc\/passwd|menuId=--/i);

            const malformedPaths = [
                '/admin/community/boards/detail?bbsId=INVALID_ID&pstId=999999',
                '/admin/user/manage?userId=../../../etc/passwd',
                '/admin/system/menus?menuId=--'
            ];

            for (const path of malformedPaths) {
                console.log(`>>> Checking malformed path: ${path}`);
                await page.goto(path);

                // 핵심 계약: 화이트 스크린(React 런타임 크래시)이 아니어야 한다 → 관리자 셸이 생존해야 함.
                // (auto consoleGuard가 pageerror/console.error/hydration을 이미 실패로 잡으므로 이중 방어)
                await expect(page.locator('aside, nav, header').first()).toBeVisible({ timeout: 15000 });
                console.log(`>>> Malformed path ${path} handled gracefully (shell survived).`);
            }
        });
    });
});
