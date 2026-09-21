import { expect,test } from '../fixtures/browser-test';
import { getAdminBearerToken } from '../utils/admin-token';
const BOARD_API = '/api/v1/boards';
/** 시딩한 게시글만 지우기 위한 접두사. globalTeardown(cleanup-db.ts)의 'E2E' 스윕과도 정합. */
const PREFIX = 'E2E22_';
test.describe('Deep Security Guard', () => {
    test.describe('Advanced XSS & Payload Sanitization', () => {
        test.use({ storageState: 'playwright/.auth/admin.json' });
        test("저장한 게시글 댓글의 XSS payload가 브라우저에서 실행되지 않는다", async ({ page, request }) => {
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
                    await expect(page.locator('p.whitespace-pre-wrap').filter({ hasText: payload }).first()).toBeVisible({ timeout: 10000 });
                    // 주입된 '라이브' DOM 노드가 실제로 생성되지 않아야 한다.
                    await expect(page.locator('img[onerror], svg[onload], details[ontoggle]')).toHaveCount(0);
                    await commentInput.fill('');
                }
                // 저장(stored) 경로 재검증: 새로고침 후에도 스크립트가 실행되지 않아야 함.
                await page.reload();
                await expect(page.locator('p.whitespace-pre-wrap').first()).toBeVisible({ timeout: 10000 });
                expect(xssDialogFired, 'XSS payload가 스크립트 dialog를 발생시킴 — 새니타이제이션 실패').toBe(false);
            }
            finally {
                // 정리. deletePost 는 논리 삭제(use_yn='N')이며 댓글은 함께 지워지지 않는다 —
                // 남는 댓글은 이 임시 게시글에만 매달리므로 실 데이터를 오염시키지 않는다.
                await request.delete(`${BOARD_API}/${bbsId}/posts/${pstSn}`, { headers: auth });
            }
        });
    });
});
