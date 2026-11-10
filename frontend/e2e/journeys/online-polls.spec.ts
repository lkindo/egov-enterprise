import { randomUUID } from 'node:crypto';
import { expect,test } from '../fixtures/browser-test';
import { SurveyPage } from '../pages/SurveyPage';
/** 화면 동작이 부른 응답을 기다리는 상한 — 요청이 나가지 않으면 시험 제한 시간까지 매달리지 않고 실패해 정리가 돈다. */
const RESPONSE_WAIT = { timeout: 20_000 };
test.describe('Public Engagement & Experience', () => {
    test("온라인 투표 생성 → 일반 사용자 참여 → 관리자 목록 검색", async ({ adminPage, userPage }) => {
        const surveyTitle = `E2E Poll ${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const searchKeyword = surveyTitle;
        const adminSurvey = new SurveyPage(adminPage);
        const userSurvey = new SurveyPage(userPage);
        let pollSn: number;
        await test.step('Admin: Create and Publish Survey', async () => {
            console.log(`>>> Creating survey: ${surveyTitle}`);
            pollSn = await adminSurvey.createBasicSurvey(surveyTitle);
            console.log(`>>> Created pollSn: ${pollSn}`);
            // Verify in inventory
            await adminSurvey.gotoManage();
            await adminSurvey.searchAndWait(searchKeyword, surveyTitle);
            const surveyRow = adminPage.getByText(surveyTitle).first();
            await expect(surveyRow).toBeVisible({ timeout: 15000 });
        });
        await test.step('User: Vote via API (API-first, no UI flakiness)', async () => {
            console.log(`>>> Voting on survey pollSn: ${pollSn}`);
            // Navigate to ensure userPage has a valid session context with localStorage
            await userPage.goto('/admin/survey/polls/participate');
            await userPage.waitForLoadState('domcontentloaded');
            // Cast vote directly via API using userPage's auth context
            await userSurvey.voteByPollSn(pollSn);
            console.log(`>>> Vote completed for poll: ${pollSn}`);
        });
        await test.step('Admin: Verify Statistics', async () => {
            console.log(`>>> Verifying survey results`);
            await adminSurvey.checkResults(searchKeyword, surveyTitle);
        });
        await test.step('관리자: 결과 통계 탭에서 여론조사명으로 검색해 응답 수를 확인한다', async () => {
            await adminPage.goto('/admin/survey/hub?tab=stats');
            const main = adminPage.locator('main#main-content').filter({ visible: true });
            await expect(main.getByRole('heading', { level: 1, name: '여론조사 통계', exact: true })).toBeVisible({ timeout: 30000 });
            const searchStats = async (keyword: string) => {
                await main.getByRole('textbox', { name: '여론조사명', exact: true }).fill(keyword);
                const [listed] = await Promise.all([
                    adminPage.waitForResponse((response) => {
                        const url = new URL(response.url());
                        return url.pathname === '/api/v1/polls' && response.request().method() === 'GET'
                            && url.searchParams.get('kind') === 'SATISFACTION' && url.searchParams.get('keyword') === keyword;
                    }, RESPONSE_WAIT),
                    main.getByRole('button', { name: '조회', exact: true }).click(),
                ]);
                expect(listed.status(), '여론조사 통계 검색이 성공해야 한다').toBe(200);
            };
            const total = main.getByText('전체 여론조사', { exact: true }).locator('xpath=following-sibling::p[1]');
            await searchStats(surveyTitle);
            const row = main.getByRole('row').filter({ hasText: surveyTitle });
            await expect(row, '검색한 여론조사 한 건만 남아야 한다').toHaveCount(1);
            await expect(row.locator('td[data-label="응답 수"]'), '사용자 한 명의 투표가 응답 수에 반영되어야 한다').toHaveText('1');
            await expect(total).toHaveText('1건');
            await searchStats(`${surveyTitle}-없음`);
            await expect(main.getByText(`"${surveyTitle}-없음"에 대한 검색 결과가 없습니다.`, { exact: true })).toBeVisible();
            await expect(total).toHaveText('0건');
        });
    });
    test('Business Logic: One Person One Vote', async ({ adminPage, userPage }) => {
        const surveyTitle = `E2E Duplicate Test ${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const adminSurvey = new SurveyPage(adminPage);
        const userSurvey = new SurveyPage(userPage);
        let pollSn: number;
        await test.step('Admin: Create Survey', async () => {
            pollSn = await adminSurvey.createBasicSurvey(surveyTitle);
        });
        await test.step('User: Vote Twice (Should Fail Second Time)', async () => {
            console.log(`>>> Voting first time for: ${surveyTitle} (pollSn: ${pollSn})`);
            // Navigate to participate page to establish context
            await userPage.goto('/admin/survey/polls/participate');
            await userPage.waitForLoadState('domcontentloaded');
            // First vote - use API for reliability
            await userSurvey.voteByPollSn(pollSn);
            console.log(`>>> First vote completed via API`);
            // Try to vote again via UI
            await userPage.goto('/admin/survey/polls/participate');
            // Find the survey card and click it
            const surveyCard = userPage.getByText(new RegExp(surveyTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')).first();
            await expect(surveyCard).toBeVisible({ timeout: 10000 });
            await surveyCard.click();
            // [E2E 감사 B] '!submitBtn.isVisible()' 분기 제거 — 깨진/빈 참여 화면(버튼 미렌더)도 통과시키던
            // 항상-참 disjunct였음. 이미-참여 메시지 또는 명시적 disabled 상태만 유효한 차단 증거로 인정한다.
            // [2026-09-26 DIP B5 F2] 본문으로 좁힌다 — 사이드바 말단 메뉴의 즐겨찾기 버튼('투표 참여 즐겨찾기')도
            //   이름에 '투표' 가 있어, 페이지 전체에서 찾으면 본문보다 먼저 렌더되는 그 버튼을 잡았다.
            //   보이는 본문만 본다 — 셸을 다시 그리는 동안 숨은 서버 사본의 본문이 잠시 함께 있다(PR #959).
            const content = userPage.locator('main#main-content').filter({ visible: true });
            const message = content.getByText(/이미 참여|already participated|참여.*완료/i).first();
            const submitBtn = content.getByRole('button', { name: /투표|제출|Vote/i }).first();
            await expect(message.or(submitBtn)).toBeVisible({ timeout: 10000 });
            const messageVisible = await message.isVisible().catch(() => false);
            // [2026-09-26 DIP V7] 이미 참여한 투표는 결과 화면으로 열려 제출 버튼이 없다. isDisabled() 는 없는 버튼을
            // 테스트 제한 시간까지 기다리므로, 버튼이 있을 때만 비활성 여부를 본다.
            const btnDisabled = (await submitBtn.count()) > 0 && await submitBtn.isDisabled().catch(() => false);
            console.log(`>>> Duplicate vote check: message=${messageVisible}, disabled=${btnDisabled}`);
            expect(messageVisible || btnDisabled, '2차 투표가 차단(이미 참여 메시지 또는 제출 버튼 비활성)되어야 함').toBeTruthy();
            console.log(`>>> Successfully verified duplicate vote protection`);
        });
    });
    test('온라인 투표: 관리 화면 등록·검색·새로고침 → 사용자 화면 투표 → 집계 결과 확인', async ({ adminPage, userPage, adminRequest }) => {
        const marker = `${Date.now()}-${randomUUID().slice(0, 8)}`;
        const title = `E2E 온라인 투표 ${marker}`;
        const choices = [`찬성 ${marker}`, `반대 ${marker}`] as const;
        const adminMain = adminPage.locator('main#main-content').filter({ visible: true });
        const userMain = userPage.locator('main#main-content').filter({ visible: true });
        // 빈 결과 행의 문구('"<검색어>"에 대한 검색 결과가 없습니다.')도 제목을 품는다 — 투표 행만 갖는 '설문 SN:' 칸으로 가른다.
        const pollRow = adminMain.getByRole('row').filter({ hasText: title }).filter({ hasText: '설문 SN:' });
        let pollSn: number | undefined;
        // 관리 목록(온라인 투표 종류)의 이 검색어 조회 응답을 기다린다.
        const pollListResponse = (keyword: string) => adminPage.waitForResponse((response) => {
            const url = new URL(response.url());
            return url.pathname === '/api/v1/polls' && response.request().method() === 'GET'
                && url.searchParams.get('kind') === 'POLL' && url.searchParams.get('keyword') === keyword;
        }, RESPONSE_WAIT);
        const searchPolls = async (keyword: string) => {
            // 표의 '설문명' 열 머리도 같은 접근 이름(aria-label)을 가진다 — 조회 조건의 입력 칸으로 좁힌다.
            await adminMain.getByRole('textbox', { name: '설문명', exact: true }).fill(keyword);
            const [listed] = await Promise.all([
                pollListResponse(keyword),
                adminMain.getByRole('button', { name: '조회', exact: true }).click(),
            ]);
            expect(listed.status(), '온라인 투표 목록 검색이 성공해야 한다').toBe(200);
        };
        try {
            await test.step('관리자: 신규 설문 등록 대화상자로 온라인 투표를 등록한다', async () => {
                await adminPage.goto('/admin/survey/polls');
                await expect(adminMain.getByRole('heading', { name: '온라인 투표 관리', exact: true })).toBeVisible({ timeout: 30000 });
                await adminMain.getByRole('button', { name: '신규 설문 등록', exact: true }).click();
                const dialog = adminPage.getByRole('dialog', { name: '신규 설문 등록', exact: true });
                await dialog.getByRole('textbox', { name: '설문명', exact: true }).fill(title);
                await dialog.getByRole('textbox', { name: '선택 항목 1 내용', exact: true }).fill(choices[0]);
                await dialog.getByRole('textbox', { name: '선택 항목 2 내용', exact: true }).fill(choices[1]);
                const [created] = await Promise.all([
                    adminPage.waitForResponse((response) => new URL(response.url()).pathname === '/api/v1/polls'
                        && response.request().method() === 'POST', RESPONSE_WAIT),
                    dialog.getByRole('button', { name: '설문 등록', exact: true }).click(),
                ]);
                expect(created.status(), '화면에서 온라인 투표 등록이 성공해야 한다').toBe(201);
                pollSn = (await created.json()).data as number;
                expect(pollSn).toBeGreaterThan(0);
                await expect(dialog).toBeHidden();
                const stored = await adminRequest.get(`/api/v1/polls/${pollSn}`);
                expect(stored.status()).toBe(200);
                const storedPoll = (await stored.json()).data as { pollNm: string; pollKndCd: string; pollArticles: { pollArtclNm: string }[] };
                expect(storedPoll.pollNm).toBe(title);
                expect(storedPoll.pollKndCd).toBe('POLL01');
                expect(storedPoll.pollArticles.map(article => article.pollArtclNm).sort()).toEqual([...choices].sort());
            });
            await test.step('관리자: 검색하면 등록한 투표만 남고 없는 이름은 빈 결과가 된다', async () => {
                await searchPolls(title);
                await expect(pollRow, '검색한 온라인 투표 한 건만 남아야 한다').toHaveCount(1);
                await expect(pollRow).toContainText(`설문 SN: ${pollSn}`);
                await expect(pollRow.locator('td[data-label="참여 수"]')).toHaveText('0');
                await searchPolls(`${title}-없음`);
                await expect(adminMain.getByText(`"${title}-없음"에 대한 검색 결과가 없습니다.`, { exact: true })).toBeVisible();
                await expect(pollRow).toHaveCount(0);
                // 같은 검색어로 되돌리면 화면은 앞서 받은 결과(조회 캐시)를 다시 쓸 수 있어 새 요청이 나가지 않을 수 있다 — 화면만 본다.
                //   서버 재조회는 아래 새로고침 단계가 응답으로 확인한다.
                await adminMain.getByRole('textbox', { name: '설문명', exact: true }).fill(title);
                await adminMain.getByRole('button', { name: '조회', exact: true }).click();
                await expect(pollRow).toHaveCount(1);
            });
            await test.step('사용자: 투표 참여 화면에서 투표를 열고 항목을 골라 제출한 뒤 집계를 본다', async () => {
                await userPage.goto('/admin/survey/polls/participate');
                const card = userMain.getByRole('button').filter({ hasText: title });
                await expect(card, '진행 중인 온라인 투표가 참여 목록에 보여야 한다').toBeVisible({ timeout: 30000 });
                const [items] = await Promise.all([
                    userPage.waitForResponse((response) => new URL(response.url()).pathname === `/api/v1/polls/${pollSn}/items`
                        && response.request().method() === 'GET', RESPONSE_WAIT),
                    card.click(),
                ]);
                expect(items.status(), '투표 항목 조회가 성공해야 한다').toBe(200);
                await expect(userMain.getByRole('heading', { level: 2, name: title, exact: true })).toBeVisible();
                await expect(userMain.getByText('항목을 선택하세요', { exact: true })).toBeVisible();
                const chosen = userMain.getByRole('button', { name: choices[0], exact: true });
                const other = userMain.getByRole('button', { name: choices[1], exact: true });
                await expect(chosen).toBeVisible();
                await expect(other).toBeVisible();
                await chosen.click();
                await userMain.getByRole('button', { name: '투표 제출하기', exact: true }).click();
                const confirmation = userPage.getByRole('dialog', { name: '투표 제출', exact: true });
                await expect(confirmation).toContainText(choices[0]);
                const [voted] = await Promise.all([
                    userPage.waitForResponse((response) => new URL(response.url()).pathname.startsWith(`/api/v1/polls/${pollSn}/vote/`)
                        && response.request().method() === 'POST', RESPONSE_WAIT),
                    confirmation.getByRole('button', { name: '투표 제출', exact: true }).click(),
                ]);
                expect(voted.status(), '화면에서 투표 제출이 성공해야 한다').toBe(200);
                await expect(userMain.getByText('집계 결과', { exact: true })).toBeVisible();
                await expect(chosen, '고른 항목에 한 표가 집계되어야 한다').toContainText('1표');
                await expect(chosen).toContainText('100%');
                await expect(other).toContainText('0표');
            });
            await test.step('관리자: 새로고침이 사용자의 투표를 참여 수에 반영한다', async () => {
                const [refreshed] = await Promise.all([
                    pollListResponse(title),
                    adminMain.getByRole('button', { name: '설문 목록 새로고침', exact: true }).click(),
                ]);
                expect(refreshed.status(), '온라인 투표 목록 새로고침이 성공해야 한다').toBe(200);
                await expect(pollRow.locator('td[data-label="참여 수"]'), '새로고침한 목록이 서버의 참여 수를 보여야 한다').toHaveText('1');
            });
        } finally {
            // 두 화면을 먼저 떠난 뒤 이 시험이 만든 투표만 지운다(투표 결과도 서버가 함께 정리한다).
            await userPage.goto('about:blank');
            await adminPage.goto('about:blank');
            if (pollSn !== undefined) {
                const cleanup = await adminRequest.delete(`/api/v1/polls/${pollSn}`);
                expect(cleanup.status(), '이 시험이 만든 온라인 투표를 정리한다').toBe(200);
            }
        }
    });
});
