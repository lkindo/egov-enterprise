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
    
    // [2026-08-10 이관] 삭제됨: 'IDOR (Insecure Direct Object Reference) Protection' describe 전체.
    //
    //   ⚠ 두 테스트 모두 **이름이 검증 내용과 달랐고**, 실제로 검증하던 것은 다른 파일이 이미 소유한 계약이었다.
    //     · 'Access Denied for Direct User ID Manipulation'
    //         → 쿼리스트링이 붙었을 뿐 `/admin/user/manage` 경로의 비관리자 차단이다. 즉 IDOR 이 아니라
    //           **미들웨어 경로 RBAC**이며, 23-E4 매트릭스가 '쿼리스트링으로 경로 판정을 흐릴 수 없다'로 소유한다.
    //           (종전 구현은 `url === 'http://localhost:3001/'` 하드코딩 + if/else 양방향 통과라
    //            차단 방식이 바뀌어도 red 가 나지 않았다.)
    //     · 'API Boundary: Unauthorized Direct API Access'
    //         → 토큰을 싣지 않은 **익명** 요청이다(주석 스스로 인정하고 있었다). 23-E3 의
    //           'anonymous request is rejected on admin API' 로 옮겼다. 인증된 비관리자의 권한상승 차단은
    //           같은 E3 가 유효 토큰을 실어 3개 엔드포인트로 검증한다 — 그쪽이 더 강한 단언이다.
    //
    //   진짜 IDOR(사용자 A 의 리소스를 사용자 B 가 조회/삭제)은 아직 어디에도 없다.
    //   23 파일 상단 TODO backlog 의 **E6** 로 등록돼 있다 — 이 파일이 그것을 검증한 적은 한 번도 없었으므로
    //   삭제로 잃는 커버리지는 없다.

    test.describe('Advanced XSS & Payload Sanitization', () => {
        test.use({ storageState: 'playwright/.auth/admin.json' });

        test('XSS Sanitization: Complex Payloads in Board Comments', async ({ page, request }) => {
            const bbsId = 'BBSMSTR_AAAAAAAAAAAA';
            const auth = { Authorization: `Bearer ${getAdminBearerToken()}` };

            // [하드코딩 ID 제거] 과거에는 pstSn '1108'(기존 게시글)에 의존했다. 그 행이 사라지면
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
            const pstSn = (await createRes.json()).data as string;
            expect(pstSn, '서버가 채번한 게시글 ID 가 반환되어야 한다').toBeTruthy();

            // [E2E 감사 A2] XSS payload가 실행되면 alert() → dialog 이벤트가 발생한다.
            // dialog가 한 번이라도 뜨면 즉시 실패 처리한다(과거에는 무단언 console.log만 있어 취약해도 그린이었음).
            let xssDialogFired = false;
            page.on('dialog', async (dialog) => {
                xssDialogFired = true;
                console.error(`🚨 [XSS EXECUTED] Unexpected script dialog: ${dialog.message()}`);
                await dialog.dismiss();
            });

            try {
                await page.goto(`/admin/community/boards/detail?bbsId=${bbsId}&pstSn=${pstSn}`);

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
                    // [2026-08-06] `/Commit Response|등록/i` 에서 '등록' 대안을 제거한다.
                    //
                    // 이 버튼의 라벨은 'Commit Response'(또는 전송 중 'COMMITTING...')뿐이고
                    // **'등록' 이었던 적이 없다**(CommentSection.tsx 실측). 즉 그 대안은 이 버튼을
                    // 맞춘 적이 없고, **다른 폼의 버튼만 잡는 오매칭원**이었다.
                    //
                    // 실제로 게시글 상세에 만족도 위젯이 추가되자 '등록' 버튼이 하나 더 생겨
                    // strict mode violation(resolved to 2 elements)으로 이 XSS 검증이 죽었다.
                    // 위젯 라벨을 '만족도 등록' 으로 바꿔도 해결되지 않는다 — 정규식이 앵커 없는
                    // 부분 일치라 '만족도 등록' 도 여전히 `/등록/i` 에 걸린다.
                    //
                    // 근본 원인은 셀렉터가 대상 버튼을 특정하지 못한 것이므로 셀렉터를 좁힌다.
                    // 이는 검증을 약화시키지 않는다 — 오히려 의도한 버튼만 정확히 누른다.
                    await page.getByRole('button', { name: /댓글 등록/ }).click();

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
                await request.delete(`${BOARD_API}/${bbsId}/posts/${pstSn}`, { headers: auth });
            }
        });
    });

    test.describe('URL Integrity & Navigation Guards', () => {
        test.use({ storageState: 'playwright/.auth/admin.json' });

        test('Handling Malformed UUID/IDs in URLs', async ({ page }) => {
            // 쿼리 문자열 자체는 오류가 아니다. 종전 패턴은 해당 문자열이 포함된 모든 콘솔/HTTP 오류를
            // 상태·횟수와 무관하게 숨겼다. 셸 생존 외의 브라우저 오류가 생기면 그대로 실패시킨다.

            const malformedPaths = [
                '/admin/community/boards/detail?bbsId=INVALID_ID&pstSn=999999',
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
