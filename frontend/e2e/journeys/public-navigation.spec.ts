import { randomUUID } from 'node:crypto';
import type { APIRequestContext, Response as NetworkResponse } from '@playwright/test';
import { expect,test } from '../fixtures/browser-test';
import { screenYmd } from '../helpers/screen-date';
test.describe('공개 포털', () => {
    test.describe('Public Engagement & Experience', () => {
        test("일반 사용자 설문 목록과 개인 결재함 제목을 표시한다", async ({ userPage }) => {
            await test.step('User: Access Public Survey List', async () => {
                console.log('>>> [User] Navigating to Public Survey portal');
                await userPage.goto('/survey');
                await expect(userPage.locator('h1, h2, h3, .title').filter({ hasText: /설문.*조사|Poll/i }).first()).toBeVisible({ timeout: 15000 });
            });
            await test.step('User: Access Personal Approval Inbox', async () => {
                console.log('>>> [User] Navigating to Personal Approvals');
                await userPage.goto('/approvals');
                await expect(userPage.locator('h1, h2, h3, .title').filter({ hasText: /Approval Hub|결재.*|My Approvals/i }).first()).toBeVisible({ timeout: 15000 });
            });
        });
    });
});

const SURVEYS = '/api/v1/admin/system/surveys';
const RESPONSES = '/api/v1/admin/system/survey-responses';
type Survey = { srvySn: number; srvyTtl: string; srvyTmpltSn: number; srvyBgngYmd: string; srvyEndYmd: string };
type Template = { srvyTmpltSn: number; srvyTmpltTypeCd: string; srvyTmpltExpln: string };
type Question = { srvyQstnSn: number; srvySn: number; qstnCn: string;
    items: { srvyArtclSn: number; artclCn: string }[] };
type SurveyResponse = { srvyRspnsSn: number; srvySn: number; srvyQstnSn: number; srvyArtclSn: number; rspdntAnsCn: string | null;
    rspnsNm: string | null };
type ResponsePage = { list: SurveyResponse[]; totalPage: number };

async function readData<T>(request: APIRequestContext, url: string): Promise<T> {
    const response = await request.get(url);
    expect(response.status(), '소유한 합성 설문 데이터 조회가 성공해야 한다').toBe(200);
    return (await response.json() as { data: T }).data;
}

test.describe('설문 응답 생명주기', () => {
    test('설문 생성·참여·선택답 확인: 기간 등록·수정과 관리자 목록·상세 표시', async ({ adminPage, actorPage, adminRequest }) => {
        // browser-test의 자동 isolatedTarget 검사와 정상 API로 생성한 합성 사용자만 사용한다.
        // online-polls의 pollSn과 구분되는 실제 srvySn 설문 생명주기다.
        const unique = randomUUID();
        const templateCode = `R6${unique.replaceAll('-', '').slice(0, 10)}`;
        const templateDescription = `E2E R6 설문 템플릿 ${unique}`;
        const surveyTitle = `E2E R6 기간·선택 응답 ${unique}`;
        const users = '/api/v1/admin/system/users';
        const userId = `E2E_SR_${unique.replaceAll('-', '').slice(0, 10)}`;
        const userName = `E2E Survey ${unique.replaceAll('-', '').slice(0, 10)}`;
        const password = `Aa1!${randomUUID()}`;
        const { page: userPage, context: userContext } = await actorPage({ storageState: { cookies: [], origins: [] } });
        let userCreated = false;
        const questionFixtures = [1, 2].map(index => ({
            questionText: `검증할 문항 ${index} ${unique}`,
            choiceLabel: `문항 ${index}에서 선택한 답변 ${unique}`,
            unselectedLabel: `문항 ${index}에서 선택하지 않은 답변 ${unique}`,
        }));
        const year = Number(screenYmd().slice(0, 4));
        const initial = { begin: `${year - 1}-01-02`, end: `${year + 1}-12-30` };
        const edited = { begin: `${year - 1}-01-03`, end: `${year + 1}-12-29` };
        let templateId: number | undefined;
        let surveyId: number | undefined;

        try {
            await test.step('생성 시각이 확인되는 새 일반 사용자를 정상 API로 준비한다', async () => {
                // 기존 TEST1 seed는 crt_dt가 NULL이다. 승인된 legacy 취소 거부를 완화하지 않고 신규 제출의 성공 경로를 검증한다.
                const created = await adminRequest.post(users, {
                    data: { userId, userNm: userName, pswd: password, role: 'USER' },
                });
                userCreated = created.ok();
                expect(created.status()).toBe(201);
                const owned = await readData<{ userId: string; userNm: string; crtDt?: string }>(adminRequest, `${users}/${userId}`);
                expect(owned.userId).toBe(userId);
                expect(owned.userNm).toBe(userName);
                expect(Number.isFinite(Date.parse(owned.crtDt ?? '')), '신규 계정의 생성 시각이 저장되어야 한다').toBe(true);
                // 이 전용 브라우저 컨텍스트에만 BFF 로그인 쿠키를 받는다. 공유 TEST1 인증 상태는 바꾸지 않는다.
                const loggedIn = await userContext.request.post('/api/v1/auth/login', { data: { userId, password } });
                expect(loggedIn.status()).toBe(200);
                // Production cookies stay Secure. Chromium recognizes this owned loopback
                // as a secure context; APIRequestContext's HTTP cookie filter does not.
                const [currentResponse] = await Promise.all([
                    userPage.waitForResponse(response => new URL(response.url()).pathname === '/api/v1/auth/me'
                        && response.request().method() === 'GET' && response.status() === 200),
                    userPage.goto('/survey'),
                ]);
                const current = (await currentResponse.json()).data as { id: string };
                expect(current.id).toBe(userId);
            });
            await test.step('합성 템플릿 준비 후 실제 폼으로 시작일·종료일을 저장한다', async () => {
                const created = await adminRequest.post(`${SURVEYS}/templates`, {
                    data: { srvyTmpltTypeCd: templateCode, srvyTmpltExpln: templateDescription },
                });
                expect(created.status()).toBe(201);
                const templates = await readData<{ list: Template[] }>(adminRequest,
                    `${SURVEYS}/templates?keyword=${encodeURIComponent(templateCode)}&page=1&size=10`);
                const owned = templates.list.filter(template => template.srvyTmpltTypeCd === templateCode
                    && template.srvyTmpltExpln === templateDescription);
                expect(owned).toHaveLength(1);
                templateId = owned[0].srvyTmpltSn;

                await adminPage.goto('/admin/survey/hub?tab=questions');
                // 보이는 본문만 본다 — 첫 화면 직후 셸을 브라우저가 다시 그리면 서버 사본이 숨은 `div#S:n` 안에 잠시 남아
                //   본문이 두 벌이 된다(2026-10-21 strict 위반, PR #959). 이 파일의 본문 locator 는 모두 같은 이유로 좁힌다.
                const main = adminPage.locator('main#main-content').filter({ visible: true });
                await main.getByLabel('설문지 제목', { exact: true }).fill(surveyTitle);
                await main.getByRole('combobox', { name: '템플릿', exact: true }).selectOption(String(templateId));
                await main.getByLabel('설문 시작일', { exact: true }).fill(initial.begin);
                await main.getByLabel('설문 종료일', { exact: true }).fill(initial.end);
                const registered = adminPage.waitForResponse(response => new URL(response.url()).pathname === SURVEYS
                    && response.request().method() === 'POST');
                await main.getByRole('button', { name: '설문지 등록', exact: true }).click();
                expect((await registered).status()).toBe(201);
                const surveys = await readData<{ list: Survey[] }>(adminRequest,
                    `${SURVEYS}?keyword=${encodeURIComponent(surveyTitle)}&page=1&size=10`);
                const ownedSurveys = surveys.list.filter(survey => survey.srvyTtl === surveyTitle
                    && survey.srvyTmpltSn === templateId);
                expect(ownedSurveys).toHaveLength(1);
                surveyId = ownedSurveys[0].srvySn;
                expect(ownedSurveys[0].srvyBgngYmd).toBe(initial.begin.replaceAll('-', ''));
                expect(ownedSurveys[0].srvyEndYmd).toBe(initial.end.replaceAll('-', ''));
            });

            await test.step('저장된 기간을 다시 열어 수정하고 서버 값과 재진입 값을 확인한다', async () => {
                const main = adminPage.locator('main#main-content').filter({ visible: true });
                await main.getByRole('combobox', { name: '설문 선택', exact: true }).selectOption(String(surveyId));
                await main.getByRole('button', { name: `${surveyTitle} 제목·기간 수정`, exact: true }).click();
                await expect(main.getByLabel('설문 시작일 수정', { exact: true })).toHaveValue(initial.begin);
                await expect(main.getByLabel('설문 종료일 수정', { exact: true })).toHaveValue(initial.end);
                await main.getByLabel('설문 시작일 수정', { exact: true }).fill(edited.begin);
                await main.getByLabel('설문 종료일 수정', { exact: true }).fill(edited.end);
                const updated = adminPage.waitForResponse(response => new URL(response.url()).pathname === `${SURVEYS}/${surveyId}`
                    && response.request().method() === 'PUT');
                await main.getByRole('button', { name: '저장', exact: true }).click();
                expect((await updated).status()).toBe(200);
                const saved = await readData<Survey>(adminRequest, `${SURVEYS}/${surveyId}`);
                expect(saved.srvyBgngYmd).toBe(edited.begin.replaceAll('-', ''));
                expect(saved.srvyEndYmd).toBe(edited.end.replaceAll('-', ''));
                await expect(main.getByLabel('설문 시작일 수정', { exact: true })).toHaveCount(0);
                await adminPage.reload();
                await main.getByRole('combobox', { name: '설문 선택', exact: true }).selectOption(String(surveyId));
                await main.getByRole('button', { name: `${surveyTitle} 제목·기간 수정`, exact: true }).click();
                await expect(main.getByLabel('설문 시작일 수정', { exact: true })).toHaveValue(edited.begin);
                await expect(main.getByLabel('설문 종료일 수정', { exact: true })).toHaveValue(edited.end);
                await main.getByRole('button', { name: '취소', exact: true }).click();
            });

            const selectedAnswers: { srvyQstnSn: number; srvyArtclSn: number; choiceLabel: string }[] = [];
            await test.step('소유 설문의 두 문항·선택지를 준비하고 일반 사용자가 브라우저에서 함께 제출한다', async () => {
                for (const { questionText, choiceLabel, unselectedLabel } of questionFixtures) {
                    const created = await adminRequest.post(`${SURVEYS}/${surveyId}/questions`, {
                        data: { qstnTypeCd: '1', qstnCn: questionText, maxChcCnt: 1 },
                    });
                    expect(created.status()).toBe(201);
                    const questions = await readData<Question[]>(adminRequest, `${SURVEYS}/${surveyId}/questions`);
                    const owned = questions.filter(question => question.srvySn === surveyId && question.qstnCn === questionText);
                    expect(owned).toHaveLength(1);
                    const questionId = owned[0].srvyQstnSn;
                    for (const [index, label] of [choiceLabel, unselectedLabel].entries()) {
                        const item = await adminRequest.post(`${SURVEYS}/questions/${questionId}/items`, {
                            data: { artclSn: index + 1, artclCn: label, etcAnsYn: 'N' },
                        });
                        expect(item.status()).toBe(201);
                    }
                    const populated = await readData<Question[]>(adminRequest, `${SURVEYS}/${surveyId}/questions`);
                    const selected = populated.find(question => question.srvyQstnSn === questionId)?.items
                        .filter(item => item.artclCn === choiceLabel) ?? [];
                    expect(selected).toHaveLength(1);
                    selectedAnswers.push({ srvyQstnSn: questionId, srvyArtclSn: selected[0].srvyArtclSn, choiceLabel });
                }
                expect(selectedAnswers).toHaveLength(2);
                expect(new Set(selectedAnswers.map(answer => answer.srvyQstnSn)).size).toBe(2);
                expect(new Set(selectedAnswers.map(answer => answer.srvyArtclSn)).size).toBe(2);
                // [2026-10-01 결정 21] 새 설문은 작성 중이라 응답자 목록에 없다 — 공개한 뒤에만 보인다.
                // APIRequestContext 는 loopback 에서 Secure 인증 쿠키를 싣지 않으므로 브라우저 안에서 조회한다.
                const listedTitles = () => userPage.evaluate(async (title) => {
                    const response = await fetch(`/api/v1/surveys?keyword=${encodeURIComponent(title)}&page=1&size=10`);
                    const body = await response.json() as { data?: { list?: { srvyTtl: string }[] } };
                    return { status: response.status, titles: (body.data?.list ?? []).map(survey => survey.srvyTtl) };
                }, surveyTitle);
                const draft = await listedTitles();
                expect(draft.status).toBe(200);
                expect(draft.titles, '작성 중 설문은 응답자 목록에 보이지 않아야 한다').not.toContain(surveyTitle);
                const adminMain = adminPage.locator('main#main-content').filter({ visible: true });
                await adminPage.reload();
                // 설문지를 고르면 서버가 준 그 설문지의 문항·선택 항목이 패널에 실린다(설문지 상세).
                const [questionsLoaded] = await Promise.all([
                    adminPage.waitForResponse(response => new URL(response.url()).pathname === `${SURVEYS}/${surveyId}/questions`
                        && response.request().method() === 'GET'),
                    adminMain.getByRole('combobox', { name: '설문 선택', exact: true }).selectOption(String(surveyId)),
                ]);
                expect(questionsLoaded.status(), '고른 설문지의 문항 조회가 성공해야 한다').toBe(200);
                for (const { questionText, choiceLabel, unselectedLabel } of questionFixtures) {
                    await expect(adminMain.getByRole('button', { name: `${questionText} 문항 수정`, exact: true })).toBeVisible();
                    for (const label of [choiceLabel, unselectedLabel]) {
                        await expect(adminMain.getByRole('button', { name: `${label} 항목 수정`, exact: true })).toBeVisible();
                    }
                }
                const released = adminPage.waitForResponse(response => new URL(response.url()).pathname === `${SURVEYS}/${surveyId}`
                    && response.request().method() === 'PUT');
                await adminMain.getByRole('button', { name: '응답자에게 공개', exact: true }).click();
                await adminPage.getByRole('dialog').getByRole('button', { name: '공개', exact: true }).click();
                expect((await released).status()).toBe(200);
                await expect(adminMain.getByRole('button', { name: '공개 중단', exact: true })).toBeVisible();
                expect((await listedTitles()).titles, '공개한 설문은 응답자 목록에 보여야 한다').toContain(surveyTitle);
                // 응답자 설문 목록 화면에서 공개한 설문을 찾아 연다. 서버 정렬을 가정하지 않고, 화면이 받은 페이지 응답에
                // 그 설문이 실릴 때까지 '다음 페이지'로 넘긴다.
                const main = userPage.locator('main#main-content').filter({ visible: true });
                const surveyListPage = (pageNo: number) => userPage.waitForResponse(response => {
                    const url = new URL(response.url());
                    return url.pathname === '/api/v1/surveys' && response.request().method() === 'GET'
                        && url.searchParams.get('page') === String(pageNo) && url.searchParams.get('size') === '10'
                        && !url.searchParams.has('keyword');
                });
                const readSurveyPage = async (response: NetworkResponse) => {
                    expect(response.status(), '응답자 설문 목록 조회가 성공해야 한다').toBe(200);
                    return (await response.json() as { data: { list: { srvySn: number }[]; totalPage: number } }).data;
                };
                let listPage = 1;
                let [listResponse] = await Promise.all([surveyListPage(listPage), userPage.goto('/survey')]);
                let listed = await readSurveyPage(listResponse);
                while (!listed.list.some(survey => survey.srvySn === surveyId)) {
                    expect(listPage, '공개한 설문이 응답자 목록의 어느 페이지에도 없다').toBeLessThan(listed.totalPage);
                    listPage += 1;
                    [listResponse] = await Promise.all([
                        surveyListPage(listPage),
                        main.getByRole('button', { name: '다음 페이지', exact: true }).click(),
                    ]);
                    listed = await readSurveyPage(listResponse);
                }
                const listedRow = main.getByRole('row').filter({ hasText: surveyTitle });
                await expect(listedRow, '공개한 설문이 응답자 목록 표에 보여야 한다').toBeVisible();
                await expect(listedRow).toContainText(`${edited.begin} ~ ${edited.end}`);
                await listedRow.getByRole('button', { name: `${surveyTitle} 상세 이동`, exact: true }).click();
                await expect(userPage).toHaveURL(new RegExp(`/survey/${surveyId}$`));
                await expect(main.getByText(surveyTitle, { exact: true })).toBeVisible();
                await expect(main.getByText(`${edited.begin} ~ ${edited.end}`, { exact: true })).toBeVisible();
                for (const { choiceLabel } of selectedAnswers) {
                    await main.getByRole('radio', { name: choiceLabel, exact: true }).check();
                }
                const submitted = userPage.waitForResponse(response => new URL(response.url()).pathname === `/api/v1/surveys/${surveyId}/responses`
                    && response.request().method() === 'POST');
                await main.getByRole('button', { name: '응답 제출', exact: true }).click();
                const response = await submitted;
                expect(response.status()).toBe(200);
                // 자유답을 미리 넣어 표시를 통과시키지 않는다. 실제 선택 ID만 서버에 제출한다.
                expect(response.request().postDataJSON()).toEqual({
                    answers: selectedAnswers.map(({ srvyQstnSn, srvyArtclSn }) => ({ srvyQstnSn, srvyArtclSn })),
                });
                await expect(main.getByRole('button', { name: '제출 완료', exact: true })).toBeDisabled();
            });

            const responseIds = new Map<number, number>();
            let respondentName = '';
            await test.step('관리자가 두 문항의 응답 목록과 각각의 상세에서 선택한 레이블을 확인한다', async () => {
                let pageCount = 1;
                for (let page = 1; page <= pageCount && responseIds.size < selectedAnswers.length; page++) {
                    const responses = await readData<ResponsePage>(adminRequest, `${RESPONSES}?page=${page}&size=10`);
                    pageCount = responses.totalPage;
                    for (const { srvyQstnSn, srvyArtclSn, choiceLabel } of selectedAnswers) {
                        const owned = responses.list.filter(response => response.srvySn === surveyId
                            && response.srvyQstnSn === srvyQstnSn && response.srvyArtclSn === srvyArtclSn);
                        if (owned.length) {
                            expect(owned).toHaveLength(1);
                            expect(owned[0].rspdntAnsCn).toBe(choiceLabel);
                            responseIds.set(srvyArtclSn, owned[0].srvyRspnsSn);
                            respondentName = owned[0].rspnsNm ?? '';
                        }
                    }
                }
                expect(responseIds.size, '제출한 두 문항의 선택 응답이 모두 관리 API에 있어야 한다').toBe(2);
                expect(new Set(responseIds.values()).size).toBe(2);
                for (const { srvyArtclSn, choiceLabel } of selectedAnswers) {
                    const responseId = responseIds.get(srvyArtclSn);
                    expect(responseId, '제출한 선택 응답이 관리 API에 있어야 한다').toBeDefined();
                    await adminPage.goto('/survey/response');
                    const main = adminPage.locator('main#main-content').filter({ visible: true });
                    const detailSelector = `a[href="/survey/response/${responseId}"]`;
                    const detail = main.locator(detailSelector);
                    for (let page = 1; page <= pageCount; page++) {
                        await expect(main.getByText(`${page} / ${pageCount} 페이지`, { exact: true })).toBeVisible();
                        if (await detail.count()) break;
                        if (page < pageCount) await main.getByRole('button', { name: '다음', exact: true }).click();
                    }
                    const row = main.getByRole('row').filter({ has: adminPage.locator(detailSelector) });
                    await expect(row).toBeVisible();
                    await expect(row.getByRole('cell').nth(1)).toHaveText(choiceLabel);
                    await detail.click();
                    await expect(adminPage).toHaveURL(new RegExp(`/survey/response/${responseId}$`));
                    await expect(main.getByText(choiceLabel, { exact: true })).toBeVisible();
                    await expect(main.getByText('응답 내용이 등록되지 않았습니다.', { exact: true })).toHaveCount(0);
                }
                // 응답자 이름 검색 — 서버가 응답자 이름으로 걸러 이 합성 사용자의 두 문항 응답만 남긴다.
                expect(respondentName, '서버가 제출 시 응답자 이름을 채워야 한다').toBeTruthy();
                await adminPage.goto('/survey/response');
                const responseMain = adminPage.locator('main#main-content').filter({ visible: true });
                await expect(responseMain.getByRole('heading', { level: 1, name: '설문조사 응답 관리', exact: true })).toBeVisible();
                const respondentSearch = () => adminPage.waitForResponse(response => {
                    const url = new URL(response.url());
                    return url.pathname === RESPONSES && response.request().method() === 'GET'
                        && url.searchParams.get('keyword') === respondentName;
                });
                const [searched] = await Promise.all([
                    respondentSearch(),
                    responseMain.getByLabel('응답자 이름 검색', { exact: true }).fill(respondentName),
                ]);
                expect(searched.status(), '응답자 이름 검색이 성공해야 한다').toBe(200);
                const respondentRows = responseMain.getByRole('row').filter({ hasText: respondentName });
                await expect(responseMain.getByText('총 2건의 응답이 조회되었습니다.', { exact: true })).toBeVisible();
                await expect(respondentRows).toHaveCount(2);
                for (const { choiceLabel } of selectedAnswers) {
                    await expect(respondentRows.filter({ hasText: choiceLabel })).toHaveCount(1);
                }
                // 새로고침 — 같은 조건으로 서버를 다시 읽는다.
                const [refreshed] = await Promise.all([
                    respondentSearch(),
                    responseMain.getByRole('button', { name: '새로고침', exact: true }).click(),
                ]);
                expect(refreshed.status(), '응답 목록 새로고침이 성공해야 한다').toBe(200);
                await expect(respondentRows).toHaveCount(2);
            });
            await test.step('한 답변에서 전체 제출을 취소하면 두 문항이 사라지고 기간 안에 다시 제출할 수 있다', async () => {
                const anchor = responseIds.get(selectedAnswers[0].srvyArtclSn)!;
                await adminPage.goto('/survey/response');
                const main = adminPage.locator('main#main-content').filter({ visible: true });
                const selector = `a[href="/survey/response/${anchor}"]`;
                const { totalPage } = await readData<ResponsePage>(adminRequest, `${RESPONSES}?page=1&size=10`);
                await expect(main.getByText(`1 / ${totalPage} 페이지`, { exact: true })).toBeVisible();
                for (let page = 1; page < totalPage && await main.locator(selector).count() === 0; page++) {
                    await main.getByRole('button', { name: '다음', exact: true }).click();
                    await expect(main.getByText(`${page + 1} / ${totalPage} 페이지`, { exact: true })).toBeVisible();
                }
                const row = main.getByRole('row').filter({ has: adminPage.locator(selector) });
                await row.getByRole('button', { name: /전체 제출 취소$/ }).click();
                const confirmation = adminPage.getByRole('dialog', { name: '전체 제출 취소', exact: true });
                await expect(confirmation).toContainText('모든 문항·선택 답변');
                const cancelled = adminPage.waitForResponse(response => new URL(response.url()).pathname === `${RESPONSES}/${anchor}/submission`
                    && response.request().method() === 'DELETE');
                await confirmation.getByRole('button', { name: '전체 제출 취소', exact: true }).click();
                expect((await cancelled).status()).toBe(200);
                for (const responseId of responseIds.values()) {
                    expect((await adminRequest.get(`${RESPONSES}/${responseId}`)).status()).toBe(404);
                }
                await userPage.goto(`/survey/${surveyId}`);
                for (const { choiceLabel } of selectedAnswers) {
                    await userPage.getByRole('radio', { name: choiceLabel, exact: true }).check();
                }
                const submittedAgain = userPage.waitForResponse(response => new URL(response.url()).pathname === `/api/v1/surveys/${surveyId}/responses`
                    && response.request().method() === 'POST');
                await userPage.getByRole('button', { name: '응답 제출', exact: true }).click();
                expect((await submittedAgain).status()).toBe(200);
                await expect(userPage.getByRole('button', { name: '제출 완료', exact: true })).toBeDisabled();
            });
            await test.step('설문 결과 통계 화면에서 제목으로 설문지를 골라 선택 답변별 집계를 확인한다', async () => {
                await adminPage.goto('/survey/stats');
                const statsMain = adminPage.locator('main#main-content').filter({ visible: true });
                await expect(statsMain.getByRole('heading', { level: 1, name: '설문 결과 통계', exact: true })).toBeVisible();
                const [searched] = await Promise.all([
                    adminPage.waitForResponse(response => {
                        const url = new URL(response.url());
                        return url.pathname === '/api/v1/surveys' && response.request().method() === 'GET'
                            && url.searchParams.get('keyword') === surveyTitle;
                    }),
                    statsMain.getByLabel('설문 제목', { exact: true }).fill(surveyTitle),
                ]);
                expect(searched.status(), '통계 화면의 설문지 검색이 성공해야 한다').toBe(200);
                const [stats] = await Promise.all([
                    adminPage.waitForResponse(response => new URL(response.url()).pathname === `/api/v1/surveys/${surveyId}/stats`
                        && response.request().method() === 'GET'),
                    statsMain.getByRole('button', { name: surveyTitle, exact: true }).click(),
                ]);
                expect(stats.status(), '설문 결과 통계 조회가 성공해야 한다').toBe(200);
                await expect(adminPage).toHaveURL(new RegExp(`/survey/stats\\?srvySn=${surveyId}$`));
                // 다시 제출한 한 사람의 답이 문항마다 선택한 항목 1명(100%), 고르지 않은 항목 0명(0%)으로 집계된다.
                for (const { choiceLabel, unselectedLabel } of questionFixtures) {
                    await expect(statsMain.getByText(choiceLabel, { exact: true }).locator('xpath=following-sibling::span[1]'))
                        .toHaveText(/^1 명 \(100%\)/);
                    await expect(statsMain.getByText(unselectedLabel, { exact: true }).locator('xpath=following-sibling::span[1]'))
                        .toHaveText(/^0 명 \(0%\)/);
                }
            });
            await test.step('설문지·문항 화면에서 설문지를 삭제하면 서버에서도 사라진다', async () => {
                // 응답자 화면을 먼저 떠난다 — 설문 상세가 열린 채로 지우면 그 화면의 재조회가 404 를 받는다.
                await userPage.goto('about:blank');
                await adminPage.goto('/admin/survey/hub?tab=questions');
                const hubMain = adminPage.locator('main#main-content').filter({ visible: true });
                const surveySelect = hubMain.getByRole('combobox', { name: '설문 선택', exact: true });
                await surveySelect.selectOption(String(surveyId));
                await hubMain.getByRole('button', { name: '설문지 삭제', exact: true }).click();
                const confirmation = adminPage.getByRole('dialog', { name: '설문지 삭제', exact: true });
                await expect(confirmation).toContainText(surveyTitle);
                const [deleted] = await Promise.all([
                    adminPage.waitForResponse(response => new URL(response.url()).pathname === `${SURVEYS}/${surveyId}`
                        && response.request().method() === 'DELETE'),
                    confirmation.getByRole('button', { name: '삭제', exact: true }).click(),
                ]);
                expect(deleted.status(), '화면의 설문지 삭제가 성공해야 한다').toBe(200);
                await expect(surveySelect.locator(`option[value="${surveyId}"]`), '삭제한 설문지는 선택지에서 빠져야 한다').toHaveCount(0);
                expect((await adminRequest.get(`${SURVEYS}/${surveyId}`)).status(), '삭제한 설문지를 다시 조회하면 404여야 한다').toBe(404);
                surveyId = undefined;
            });
        } finally {
            // 사용자 화면을 먼저 떠난다 — 설문 상세(/survey/{id})가 열린 채로 설문을 지우면 그 화면의 재조회가 404 를 받아
            // 브라우저 오류 감시가 실패로 잡는다(2026-10-18 CI 재시도 통과 1건). 사용자 삭제도 이 뒤라 순서는 같다.
            await userPage.goto('about:blank');
            // API가 소유 설문의 자식부터 정리한다. ID와 합성 표식을 다시 대조하며 전체 목록 삭제는 하지 않는다.
            if (surveyId !== undefined) {
                const owned = await readData<Survey>(adminRequest, `${SURVEYS}/${surveyId}`);
                expect(owned.srvyTtl).toBe(surveyTitle);
                expect(owned.srvyTmpltSn).toBe(templateId);
                expect((await adminRequest.delete(`${SURVEYS}/${surveyId}`)).status()).toBe(200);
            }
            if (templateId !== undefined) {
                const owned = await readData<Template>(adminRequest, `${SURVEYS}/templates/${templateId}`);
                expect(owned.srvyTmpltTypeCd).toBe(templateCode);
                expect(owned.srvyTmpltExpln).toBe(templateDescription);
                expect((await adminRequest.delete(`${SURVEYS}/templates/${templateId}`)).status()).toBe(200);
            }
            if (userCreated) {
                const owned = await readData<{ userId: string; userNm: string }>(adminRequest, `${users}/${userId}`);
                expect(owned.userId).toBe(userId);
                expect(owned.userNm).toBe(userName);
                let removed = await adminRequest.delete(`${users}/${userId}`);
                if (removed.status() === 409) {
                    // 활동 로그의 주기 flush가 이 합성 사용자의 마지막 요청을 삽입하는 순간과 겹치면
                    // 첫 정리 트랜잭션만 FK 경합으로 되돌아간다. 설문 계약을 재실행하지 않고 정리만 한 번 재시도한다.
                    await new Promise(resolve => setTimeout(resolve, 250));
                    removed = await adminRequest.delete(`${users}/${userId}`);
                }
                expect(removed.status(), '합성 설문 사용자는 bounded cleanup 뒤 삭제되어야 한다').toBe(200);
                expect((await adminRequest.get(`${users}/${userId}`)).status()).toBe(404);
            }
        }
    });
});
test.describe('설문 템플릿 관리', () => {
    test('설문 템플릿: 화면에서 추가·상세 열기·수정·삭제가 서버에 반영된다', async ({ adminPage, adminRequest }) => {
        // 아무 설문도 참조하지 않는 새 템플릿만 다룬다 — 설문이 쓰는 템플릿은 서버가 삭제를 거부한다.
        const unique = randomUUID().replaceAll('-', '');
        const templateCode = `T7${unique.slice(0, 10)}`;
        const description = `E2E 템플릿 화면 ${unique}`;
        const editedDescription = `E2E 템플릿 수정 ${unique}`;
        const templatesApi = `${SURVEYS}/templates`;
        const main = adminPage.locator('main#main-content').filter({ visible: true });
        const codeInput = main.getByLabel('템플릿 유형 코드', { exact: true });
        const descriptionInput = main.getByLabel('템플릿 설명', { exact: true });
        const templateItem = main.getByRole('listitem').filter({ hasText: templateCode });
        let templateId: number | undefined;
        let deleted = false;
        try {
            await adminPage.goto('/admin/survey/hub?tab=templates');
            await expect(main.getByRole('heading', { level: 1, name: '설문 템플릿 관리', exact: true })).toBeVisible({ timeout: 30000 });

            // 추가 → 서버가 다시 준 목록에 보인다.
            await codeInput.fill(templateCode);
            await descriptionInput.fill(description);
            const [created] = await Promise.all([
                adminPage.waitForResponse(response => new URL(response.url()).pathname === templatesApi
                    && response.request().method() === 'POST'),
                main.getByRole('button', { name: '템플릿 추가', exact: true }).click(),
            ]);
            expect(created.status(), '화면에서 템플릿 추가가 성공해야 한다').toBe(201);
            templateId = (await created.json() as { data: number }).data;
            expect(templateId).toBeGreaterThan(0);
            await expect(templateItem, '추가한 템플릿이 다시 읽은 목록에 보여야 한다').toBeVisible();
            await expect(templateItem).toContainText(description);
            await expect(codeInput, '추가가 끝나면 입력 칸이 비워져야 한다').toHaveValue('');
            const stored = await readData<Template>(adminRequest, `${templatesApi}/${templateId}`);
            expect(stored).toMatchObject({ srvyTmpltTypeCd: templateCode, srvyTmpltExpln: description });

            // 상세 열기 — 수정 단추가 서버 상세를 읽어 폼에 싣는다.
            const [detail] = await Promise.all([
                adminPage.waitForResponse(response => new URL(response.url()).pathname === `${templatesApi}/${templateId}`
                    && response.request().method() === 'GET'),
                templateItem.getByRole('button', { name: `${description} 템플릿 수정`, exact: true }).click(),
            ]);
            expect(detail.status(), '템플릿 상세 조회가 성공해야 한다').toBe(200);
            await expect(codeInput).toHaveValue(templateCode);
            await expect(descriptionInput).toHaveValue(description);

            // 수정 → 서버 값이 바뀐다.
            await descriptionInput.fill(editedDescription);
            const [updated] = await Promise.all([
                adminPage.waitForResponse(response => new URL(response.url()).pathname === `${templatesApi}/${templateId}`
                    && response.request().method() === 'PUT'),
                main.getByRole('button', { name: '템플릿 수정 저장', exact: true }).click(),
            ]);
            expect(updated.status(), '화면에서 템플릿 수정이 성공해야 한다').toBe(200);
            await expect(templateItem, '수정한 설명이 다시 읽은 목록에 보여야 한다').toContainText(editedDescription);
            await expect(main.getByRole('button', { name: '템플릿 추가', exact: true })).toBeVisible();
            const saved = await readData<Template>(adminRequest, `${templatesApi}/${templateId}`);
            expect(saved).toMatchObject({ srvyTmpltTypeCd: templateCode, srvyTmpltExpln: editedDescription });

            // 삭제 → 확인 뒤 서버에서 사라진다.
            await templateItem.getByRole('button', { name: `${editedDescription} 템플릿 삭제`, exact: true }).click();
            const confirmation = adminPage.getByRole('dialog', { name: '설문 템플릿 삭제', exact: true });
            await expect(confirmation).toContainText(editedDescription);
            const [removed] = await Promise.all([
                adminPage.waitForResponse(response => new URL(response.url()).pathname === `${templatesApi}/${templateId}`
                    && response.request().method() === 'DELETE'),
                confirmation.getByRole('button', { name: '삭제', exact: true }).click(),
            ]);
            expect(removed.status(), '화면에서 템플릿 삭제가 성공해야 한다').toBe(200);
            deleted = true;
            await expect(templateItem, '삭제한 템플릿은 목록에서 빠져야 한다').toHaveCount(0);
            expect((await adminRequest.get(`${templatesApi}/${templateId}`)).status(), '삭제한 템플릿을 다시 조회하면 404여야 한다').toBe(404);
        } finally {
            // 화면을 먼저 떠난 뒤, 남아 있으면 이 시험이 만든 템플릿만(코드 대조 후) 지운다.
            await adminPage.goto('about:blank');
            if (templateId !== undefined && !deleted) {
                const owned = await readData<Template>(adminRequest, `${templatesApi}/${templateId}`);
                expect(owned.srvyTmpltTypeCd).toBe(templateCode);
                expect((await adminRequest.delete(`${templatesApi}/${templateId}`)).status()).toBe(200);
            }
        }
    });
});
test.describe('레거시 진입 경로', () => {
    /**
     * Business Extensions
     * 특화 비즈니스 모듈(약식결재, 간부일정, 도움말콘텐츠)에 대한 정밀 검증
     */
    test.describe('Business Extensions & Identity Governance', () => {
        test.use({ storageState: 'playwright/.auth/admin.json' });
        // [2026-09-06 DEC-OPS-040] /admin/system/ism 은 /approvals 로 통합됐다(DEC-OPS-039 제안의 owner 승인).
        //   결재 완주(상신→대기함→승인→처리함)는 11-enterprise-workflow 가 검증하므로 여기서는 별칭이 정본
        //   결재 허브에 도달하는지만 본다.
        test('ISM alias redirects to the approval hub', async ({ businessPage }) => {
            await businessPage.gotoIsm();
        });
    });
});
