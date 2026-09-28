import { randomUUID } from 'node:crypto';
import type { APIRequestContext } from '@playwright/test';
import { expect,test } from '../fixtures/browser-test';
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
type SurveyResponse = { srvyRspnsSn: number; srvySn: number; srvyQstnSn: number; srvyArtclSn: number; rspdntAnsCn: string | null };
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
        const year = new Date().getUTCFullYear();
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
                expect(created.status()).toBe(200);
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
                expect(created.status()).toBe(200);
                const templates = await readData<{ list: Template[] }>(adminRequest,
                    `${SURVEYS}/templates?keyword=${encodeURIComponent(templateCode)}&page=0&size=10`);
                const owned = templates.list.filter(template => template.srvyTmpltTypeCd === templateCode
                    && template.srvyTmpltExpln === templateDescription);
                expect(owned).toHaveLength(1);
                templateId = owned[0].srvyTmpltSn;

                await adminPage.goto('/admin/survey/hub?tab=questions');
                const main = adminPage.locator('main#main-content');
                await main.getByLabel('설문지 제목', { exact: true }).fill(surveyTitle);
                await main.getByRole('combobox', { name: '템플릿', exact: true }).selectOption(String(templateId));
                await main.getByLabel('설문 시작일', { exact: true }).fill(initial.begin);
                await main.getByLabel('설문 종료일', { exact: true }).fill(initial.end);
                const registered = adminPage.waitForResponse(response => new URL(response.url()).pathname === SURVEYS
                    && response.request().method() === 'POST');
                await main.getByRole('button', { name: '설문지 등록', exact: true }).click();
                expect((await registered).status()).toBe(200);
                const surveys = await readData<{ list: Survey[] }>(adminRequest,
                    `${SURVEYS}?keyword=${encodeURIComponent(surveyTitle)}&page=0&size=10`);
                const ownedSurveys = surveys.list.filter(survey => survey.srvyTtl === surveyTitle
                    && survey.srvyTmpltSn === templateId);
                expect(ownedSurveys).toHaveLength(1);
                surveyId = ownedSurveys[0].srvySn;
                expect(ownedSurveys[0].srvyBgngYmd).toBe(initial.begin.replaceAll('-', ''));
                expect(ownedSurveys[0].srvyEndYmd).toBe(initial.end.replaceAll('-', ''));
            });

            await test.step('저장된 기간을 다시 열어 수정하고 서버 값과 재진입 값을 확인한다', async () => {
                const main = adminPage.locator('main#main-content');
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
                    expect(created.status()).toBe(200);
                    const questions = await readData<Question[]>(adminRequest, `${SURVEYS}/${surveyId}/questions`);
                    const owned = questions.filter(question => question.srvySn === surveyId && question.qstnCn === questionText);
                    expect(owned).toHaveLength(1);
                    const questionId = owned[0].srvyQstnSn;
                    for (const [index, label] of [choiceLabel, unselectedLabel].entries()) {
                        const item = await adminRequest.post(`${SURVEYS}/questions/${questionId}/items`, {
                            data: { artclSn: index + 1, artclCn: label, etcAnsYn: 'N' },
                        });
                        expect(item.status()).toBe(200);
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
                await userPage.goto(`/survey/${surveyId}`);
                const main = userPage.locator('main#main-content');
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
            await test.step('관리자가 두 문항의 응답 목록과 각각의 상세에서 선택한 레이블을 확인한다', async () => {
                let pageCount = 1;
                for (let page = 0; page < pageCount && responseIds.size < selectedAnswers.length; page++) {
                    const responses = await readData<ResponsePage>(adminRequest, `${RESPONSES}?page=${page}&size=10`);
                    pageCount = responses.totalPage;
                    for (const { srvyQstnSn, srvyArtclSn, choiceLabel } of selectedAnswers) {
                        const owned = responses.list.filter(response => response.srvySn === surveyId
                            && response.srvyQstnSn === srvyQstnSn && response.srvyArtclSn === srvyArtclSn);
                        if (owned.length) {
                            expect(owned).toHaveLength(1);
                            expect(owned[0].rspdntAnsCn).toBe(choiceLabel);
                            responseIds.set(srvyArtclSn, owned[0].srvyRspnsSn);
                        }
                    }
                }
                expect(responseIds.size, '제출한 두 문항의 선택 응답이 모두 관리 API에 있어야 한다').toBe(2);
                expect(new Set(responseIds.values()).size).toBe(2);
                for (const { srvyArtclSn, choiceLabel } of selectedAnswers) {
                    const responseId = responseIds.get(srvyArtclSn);
                    expect(responseId, '제출한 선택 응답이 관리 API에 있어야 한다').toBeDefined();
                    await adminPage.goto('/survey/response');
                    const main = adminPage.locator('main#main-content');
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
            });
            await test.step('한 답변에서 전체 제출을 취소하면 두 문항이 사라지고 기간 안에 다시 제출할 수 있다', async () => {
                const anchor = responseIds.get(selectedAnswers[0].srvyArtclSn)!;
                await adminPage.goto('/survey/response');
                const main = adminPage.locator('main#main-content');
                const selector = `a[href="/survey/response/${anchor}"]`;
                const { totalPage } = await readData<ResponsePage>(adminRequest, `${RESPONSES}?page=0&size=10`);
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
        } finally {
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
                await userPage.goto('about:blank');
                expect((await adminRequest.delete(`${users}/${userId}`)).status()).toBe(200);
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
