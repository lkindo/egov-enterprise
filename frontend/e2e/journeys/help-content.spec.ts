import { expect,test } from '../fixtures/browser-test';
import { trackApiRequests, waitForHydration } from '../fixtures/hydration';
import { KnowledgePage } from '../pages/KnowledgePage';
import { SupportPage } from '../pages/SupportPage';
test.describe('공개 포털', () => {
    test.describe('Public Engagement & Experience', () => {
        test("FAQ 등록 → 관리자 검색 → 일반 사용자 도움말 노출과 검색", async ({ adminPage, userPage }) => {
            const faqQuestion = `E2E Security FAQ ${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            const faqAnswer = 'E2E FAQ Answer: Data is encrypted and managed safely.';
            const knowledge = new KnowledgePage(adminPage);
            const support = new SupportPage(adminPage);
            await test.step('Admin: Create FAQ', async () => {
                await knowledge.gotoFAQ();
                // 사람이 보는 제목 칸 하나를 찾는다. CSS 선택자는 React 스트리밍이 아직 드러내지 않은 숨은 조각
                // (`<div hidden id="S:n">`)의 같은 입력까지 세어, 클라이언트가 먼저 그린 폼과 함께 2개가 되면 strict 위반이 났다
                // (CI 38563148103·38841440632·38885673767·38894795018 trace). 역할 조회는 숨은 조각을 세지 않는다.
                await expect(adminPage.getByRole('textbox', { name: '게시글 제목', exact: true })).toBeVisible();
                // Preserve both direct board entry and the help hub's new-registration entry.
                await support.gotoFAQ();
                await support.createKnowledgeEntry(faqQuestion, faqAnswer);
                // Verify in admin list (Help Center FAQ list)
                await support.gotoFAQ();
                const adminSearch = adminPage.locator('input[placeholder*="검색"]').first();
                await adminSearch.fill(faqQuestion);
                await adminPage.keyboard.press('Enter');
                await expect(adminPage.getByText(faqQuestion).first()).toBeVisible({ timeout: 15000 });
            });
            await test.step('User: Verify FAQ Visibility', async () => {
                console.log(`>>> Verifying FAQ visibility for: ${faqQuestion}`);
                await userPage.goto('/help');
                // Select FAQ tab (it should be default, but let's be sure)
                const faqTab = userPage.getByRole('button', { name: /고객지원|FAQ/ }).first();
                await expect(faqTab).toBeVisible({ timeout: 15000 });
                await faqTab.click();
                console.log(`>>> [FAQ] Checking visibility for: ${faqQuestion}`);
                const faqItem = userPage.getByText(faqQuestion).first();
                // Eventual consistency retry loop
                for (let i = 0; i < 5; i++) {
                    const faqVisible = await faqItem
                        .waitFor({ state: 'visible', timeout: 2000 })
                        .then(() => true)
                        .catch(() => false);
                    if (faqVisible)
                        break;
                    console.log(`>>> [FAQ] Not found (attempt ${i + 1}), searching/reloading...`);
                    const searchInput = userPage.getByPlaceholder(/검색|Search|키워드/i);
                    if (await searchInput.isVisible()) {
                        await searchInput.fill(faqQuestion);
                        await searchInput.press('Enter');
                    }
                    else {
                        await userPage.reload();
                    }
                }
                await expect(faqItem).toBeVisible({ timeout: 10000 });
                console.log('>>> [FAQ] Found created FAQ in Portal list');
            });
            await test.step('User: Search Help Center', async () => {
                await userPage.goto('/help');
                const faqTab = userPage.getByRole('tab', { name: 'FAQ 자주 묻는 질문', exact: true });
                await waitForHydration(faqTab);
                await faqTab.click();
                const searchInput = userPage.getByRole('textbox', { name: '도움말 키워드 검색' });
                // 서버가 그린 입력은 하이드레이션 전에는 React 가 모른다 — 맡은 뒤에 입력한다.
                await waitForHydration(searchInput);
                // 검색어는 세션에 남는다 — 앞 단계가 남긴 같은 검색어면 아래 입력이 새 조회를 만들지 않으므로 먼저 비운다.
                await searchInput.fill('');
                const [searched] = await Promise.all([
                    userPage.waitForResponse(response => {
                        const url = new URL(response.url());
                        return response.request().method() === 'GET' && url.pathname === '/api/v1/boards/public-faqs'
                            && url.searchParams.get('keyword') === faqQuestion;
                    }),
                    searchInput.fill(faqQuestion),
                ]);
                expect(searched.status()).toBe(200);
                // 질문 단추(aria-expanded)만 센다 — 서버가 거른 결과는 이 시험의 FAQ 하나다.
                const questions = userPage.getByRole('tabpanel').getByRole('button', { expanded: false });
                await expect(questions).toHaveCount(1);
                await expect(questions).toContainText(faqQuestion);
            });
            await test.step('User: Open the FAQ answer', async () => {
                // 답변은 펼칠 때 서버의 FAQ 상세 조회로 받는다.
                const question = userPage.getByRole('button', { name: faqQuestion });
                await question.click();
                await expect(question).toHaveAttribute('aria-expanded', 'true');
                await expect(userPage.getByRole('region', { name: faqQuestion })).toContainText(faqAnswer);
            });
        });
        // [2026-10-19] 도움말(HPCM)·온라인 매뉴얼은 관리 화면에서 등록만 되고 일반 사용자가 읽는 화면이 없었다.
        //   도움말 센터의 두 탭이 로그인한 사용자 누구나 읽는 열람 목록을 보인다.
        test("도움말·온라인 매뉴얼 등록 → 일반 사용자 도움말 센터에서 읽는다", async ({ adminPage, userPage }) => {
            const stamp = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            const guideTitle = `E2E 도움말 ${stamp}`;
            const manualTitle = `E2E Manual ${stamp}`;
            await test.step('Admin: 도움말을 등록한다(API)', async () => {
                await adminPage.goto('/admin/system/hpcm');
                await adminPage.waitForLoadState('domcontentloaded');
                // 동일출처 /api/v1 fetch 는 미들웨어가 HttpOnly 쿠키에서 Bearer 를 주입한다(SurveyPage 와 같다).
                const result = await adminPage.evaluate(async ({ title }) => {
                    // 앱의 axios 와 같이 이중 제출 CSRF 토큰을 쿠키에서 읽어 헤더로 싣는다(ADR-0038).
                    const xsrf = document.cookie.split('; ').find((cookie) => cookie.startsWith('XSRF-TOKEN='))?.slice('XSRF-TOKEN='.length);
                    const res = await fetch('/api/v1/help/hpcm', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', ...(xsrf ? { 'X-XSRF-TOKEN': decodeURIComponent(xsrf) } : {}) },
                        body: JSON.stringify({ hlpSeCd: 'GNR', hlpDfn: title, hlpExpln: 'E2E 도움말 설명' }),
                    });
                    return { ok: res.ok, status: res.status, body: await res.text() };
                }, { title: guideTitle });
                expect(result.ok, `도움말 등록 API 실패: ${result.status} ${result.body}`).toBeTruthy();
            });
            await test.step('Admin: 온라인 매뉴얼을 화면에서 등록한다', async () => {
                const support = new SupportPage(adminPage);
                await support.gotoManuals();
                await support.createManual(manualTitle, 'E2E 매뉴얼 설명');
            });
            await test.step('User: 도움말 탭에서 읽는다', async () => {
                await userPage.goto('/help');
                await userPage.getByRole('tab', { name: '도움말', exact: true }).click();
                await userPage.getByRole('textbox', { name: '도움말 키워드 검색' }).fill(guideTitle);
                const article = userPage.getByRole('article', { name: guideTitle });
                await expect(article).toBeVisible({ timeout: 15000 });
                await expect(article).toContainText('E2E 도움말 설명');
            });
            await test.step('User: 온라인 매뉴얼 탭에서 읽는다', async () => {
                await userPage.getByRole('tab', { name: '온라인 매뉴얼' }).click();
                await userPage.getByRole('textbox', { name: '도움말 키워드 검색' }).fill(manualTitle);
                const article = userPage.getByRole('article', { name: manualTitle });
                await expect(article).toBeVisible({ timeout: 15000 });
                await expect(article).toContainText('E2E 매뉴얼 설명');
                await expect(article).toContainText('리소스 경로: /e2e/test/path');
            });
        });
    });
});
test.describe('도움말 관리', () => {
    test.describe('Support & Service Governance', () => {
        test.use({ storageState: 'playwright/.auth/admin.json' });
        test("온라인 매뉴얼을 등록하고 제목으로 검색한다", async ({ page }) => {
            const supportPage = new SupportPage(page);
            const manualTitle = `E2E Manual ${Date.now()}`;
            await test.step('Admin: Create Manual', async () => {
                await supportPage.gotoManuals();
                await supportPage.createManual(manualTitle, 'This is a test manual content for E2E validation.');
            });
            await test.step('Admin: Search and Verify', async () => {
                await supportPage.searchManual(manualTitle);
                await expect(page.getByText(manualTitle).first()).toBeVisible({ timeout: 15000 });
            });
        });
        test("질의응답을 등록하고 관리자 목록에서 검색한다", async ({ page }) => {
            const supportPage = new SupportPage(page);
            const qnaTitle = `E2E Q&A ${Date.now()}`;
            await test.step('Admin: Create Technical Q&A', async () => {
                await supportPage.gotoQna();
                await supportPage.createKnowledgeEntry(qnaTitle, 'Technical inquiry regarding enterprise framework versioning.');
            });
            await test.step('Admin: Verify Q&A Listing', async () => {
                await supportPage.gotoQna();
                const searchInput = page.locator('input[placeholder*="검색"]').first();
                await searchInput.fill(qnaTitle);
                await page.keyboard.press('Enter');
                await expect(page.getByText(qnaTitle).first()).toBeVisible({ timeout: 15000 });
            });
        });
        // 도움말 콘텐츠(HPCM) 관리 화면의 목록·검색·새로고침·등록·수정·삭제를 화면에서 하고 서버 값으로 확인한다.
        test('도움말 콘텐츠를 화면에서 등록하고 찾아 새로 고친 뒤 고치고 지운다', async ({ page, adminRequest }) => {
            const stamp = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            const hpcmApi = '/api/v1/help/hpcm';
            const nameA = `E2E 도움말 ${stamp} A`;
            const nameB = `E2E 도움말 ${stamp} B`;
            const editedExpln = `E2E 고친 도움말 설명 ${stamp}`;
            const isHpcmList = (response: { url(): string; request(): { method(): string } }, keyword: string) => {
                const url = new URL(response.url());
                return response.request().method() === 'GET' && url.pathname === hpcmApi && url.searchParams.get('keyword') === keyword;
            };
            // 떠나기 전에 화면이 보낸 /api 요청이 끝나기를 기다린다(끊긴 요청은 오류 감시가 결함으로 본다).
            const hpcmRequests = trackApiRequests(page);
            try {
                await page.goto('/admin/system/hpcm');
                await expect(page.getByRole('heading', { level: 1, name: '도움말 콘텐츠 관리(HPCM)' })).toBeVisible();
                // 서버가 그린 화면이다 — 단추·입력을 React 가 맡은 뒤에 조작한다.
                await waitForHydration(page.getByRole('button', { name: '콘텐츠 등록', exact: true }));
                const table = page.getByRole('table', { name: '도움말 콘텐츠 목록' });
                const rowOf = (name: string) => table.getByRole('row').filter({ hasText: name });
                // 데이터 행만 센다 — 행마다 'SN: <번호>' 가 있고 머리글에는 없다.
                const dataRows = table.getByRole('row').filter({ hasText: 'SN:' });
                const finder = page.getByRole('search').filter({ has: page.getByRole('textbox', { name: '도움말 명칭', exact: true }) });
                const searchFor = async (keyword: string) => {
                    await finder.getByRole('textbox', { name: '도움말 명칭', exact: true }).fill(keyword);
                    const [listed] = await Promise.all([
                        page.waitForResponse(response => isHpcmList(response, keyword)),
                        finder.getByRole('button', { name: '조회', exact: true }).click(),
                    ]);
                    expect(listed.status()).toBe(200);
                };
                let snA = 0;
                await test.step('Admin: 화면에서 도움말을 등록한다', async () => {
                    await page.getByRole('button', { name: '콘텐츠 등록', exact: true }).click();
                    const dialog = page.getByRole('dialog', { name: '도움말 콘텐츠 등록', exact: true });
                    await dialog.getByRole('textbox', { name: '분류 구분' }).fill('GNR');
                    await dialog.getByRole('textbox', { name: '도움말 명칭' }).fill(nameA);
                    await dialog.getByRole('textbox', { name: '도움말 상세 설명' }).fill(`E2E 도움말 설명 ${stamp}`);
                    const [created] = await Promise.all([
                        page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname === hpcmApi),
                        dialog.getByRole('button', { name: '최종 등록', exact: true }).click(),
                    ]);
                    expect(created.status()).toBe(201);
                    snA = (await created.json()).data as number;
                    expect(Number.isSafeInteger(snA) && snA > 0).toBe(true);
                    await expect(dialog).toBeHidden();
                });
                await test.step('Admin: 명칭으로 찾으면 등록한 도움말이 목록에 있다', async () => {
                    await searchFor(stamp);
                    await expect(dataRows).toHaveCount(1);
                    await expect(rowOf(nameA)).toContainText(`SN: ${snA}`);
                });
                await test.step('Admin: 새로고침하면 그사이 서버에 생긴 도움말이 보인다', async () => {
                    const createdB = await adminRequest.post(hpcmApi, { data: { hlpSeCd: 'GNR', hlpDfn: nameB, hlpExpln: `E2E 도움말 설명 ${stamp} B` } });
                    expect(createdB.status()).toBe(201);
                    await expect(rowOf(nameB)).toHaveCount(0);
                    const [refetched] = await Promise.all([
                        page.waitForResponse(response => isHpcmList(response, stamp)),
                        page.getByRole('button', { name: '도움말 목록 새로고침', exact: true }).click(),
                    ]);
                    expect(refetched.status()).toBe(200);
                    await expect(rowOf(nameB)).toBeVisible();
                    await expect(dataRows).toHaveCount(2);
                });
                await test.step('Admin: 더 좁게 찾으면 맞는 도움말만 남는다', async () => {
                    await searchFor(nameA);
                    await expect(dataRows).toHaveCount(1);
                    await expect(rowOf(nameA)).toBeVisible();
                    await expect(rowOf(nameB)).toHaveCount(0);
                });
                await test.step('Admin: 도움말 설명을 고친다', async () => {
                    await rowOf(nameA).getByRole('button', { name: `${nameA} 수정`, exact: true }).click();
                    const dialog = page.getByRole('dialog', { name: '도움말 콘텐츠 수정', exact: true });
                    await expect(dialog.getByRole('textbox', { name: '도움말 명칭' })).toHaveValue(nameA);
                    await dialog.getByRole('textbox', { name: '도움말 상세 설명' }).fill(editedExpln);
                    const [updated] = await Promise.all([
                        page.waitForResponse(response => response.request().method() === 'PUT'
                            && new URL(response.url()).pathname === `${hpcmApi}/${snA}`),
                        dialog.getByRole('button', { name: '수정 저장', exact: true }).click(),
                    ]);
                    expect(updated.status()).toBe(200);
                    await expect(dialog).toBeHidden();
                    await expect(rowOf(nameA)).toContainText(editedExpln);
                    const stored = await adminRequest.get(`${hpcmApi}/${snA}`);
                    expect(stored.status()).toBe(200);
                    expect((await stored.json()).data).toMatchObject({ hlpDfn: nameA, hlpExpln: editedExpln });
                });
                await test.step('Admin: 도움말을 지운다', async () => {
                    await rowOf(nameA).getByRole('button', { name: `${nameA} 삭제`, exact: true }).click();
                    const confirmDialog = page.getByRole('dialog', { name: '도움말 삭제', exact: true });
                    const [deleted] = await Promise.all([
                        page.waitForResponse(response => response.request().method() === 'DELETE'
                            && new URL(response.url()).pathname === `${hpcmApi}/${snA}`),
                        confirmDialog.getByRole('button', { name: '삭제', exact: true }).click(),
                    ]);
                    expect(deleted.status()).toBe(200);
                    await expect(rowOf(nameA)).toHaveCount(0);
                    const remaining = await adminRequest.get(hpcmApi, { params: { keyword: nameA, page: 1, size: 100 } });
                    expect(remaining.status()).toBe(200);
                    expect(((await remaining.json()).data.list as { hlpDfn: string }[]).map(item => item.hlpDfn)).not.toContain(nameA);
                    await hpcmRequests.settled(page.locator('body'));
                });
            } finally {
                // 목록 화면을 먼저 떠난 뒤 이 시험이 만든 도움말(이름에 stamp)을 남김없이 지운다.
                try {
                    await page.goto('about:blank');
                } finally {
                    const owned = await adminRequest.get(hpcmApi, { params: { keyword: stamp, page: 1, size: 100 } });
                    expect(owned.status()).toBe(200);
                    for (const item of (await owned.json()).data.list as { hlpSn: number; hlpDfn: string }[]) {
                        if (!item.hlpDfn.includes(stamp)) continue;
                        expect((await adminRequest.delete(`${hpcmApi}/${item.hlpSn}`)).status()).toBe(200);
                    }
                }
            }
        });
    });
});
test.describe('콘텐츠 페이지', () => {
    // [2026-10-22] ADR-0039 — 관리자가 만든 안내 페이지를 게시하면 로그인한 사용자 누구나 /pages/<주소> 로 읽고, 게시를 멈추면 없는 페이지가 된다.
    //   업무 홈 소개 지정은 여기서 하지 않는다 — 지정한 동안 모든 사용자의 업무 홈 맨 위가 바뀌어 같은 실행의 업무 홈 단언·시각 회귀를 흔든다.
    //   그 동작은 단위 시험(ContentPageEditor·UnifiedDashboardClient)이 맡는다.
    test('콘텐츠 페이지 작성·게시 → 일반 사용자가 주소로 읽고, 게시를 멈추면 없는 페이지다', async ({ adminPage, userPage }) => {
        const stamp = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const title = `E2E 콘텐츠 ${stamp}`;
        const slug = `e2e-cms-${stamp}`;
        const summary = `E2E 요약 ${stamp}`;
        await test.step('Admin: 업무 안내 양식으로 새 페이지를 만든다', async () => {
            await adminPage.goto('/admin/system/content-pages');
            await adminPage.getByRole('button', { name: '새 페이지' }).click();
            const dialog = adminPage.getByRole('dialog', { name: '새 콘텐츠 페이지' });
            await dialog.getByRole('textbox', { name: /페이지 제목/ }).fill(title);
            await dialog.getByRole('textbox', { name: /주소/ }).fill(slug);
            await dialog.getByRole('radio', { name: '업무 안내' }).check();
            await dialog.getByRole('button', { name: '초안 만들기' }).click();
            await expect(dialog).toBeHidden();
            await expect(adminPage.getByRole('textbox', { name: /페이지 제목/ })).toHaveValue(title);
        });
        await test.step('Admin: 양식의 작성 안내 문장을 실제 안내로 바꾸고 요약을 고쳐 초안을 저장하고 게시한다', async () => {
            // [2026-10-26] ADR-0042 — 시작 양식의 '…작성해 주세요' 문장이 남으면 게시가 막힌다. 첫 본문 칸을 실제 안내로 바꾼다.
            const body = adminPage.getByRole('textbox', { name: '안내 1단 본문' });
            await body.click();
            await adminPage.keyboard.press('ControlOrMeta+A');
            await adminPage.keyboard.type(`E2E 안내 본문 ${stamp}`);
            await adminPage.getByRole('textbox', { name: /요약/ }).fill(summary);
            await adminPage.getByRole('button', { name: '초안 저장' }).click();
            await expect(adminPage.getByText('저장하지 않은 변경', { exact: true })).toHaveCount(0);
            await adminPage.getByRole('button', { name: '게시하기' }).click();
            const dialog = adminPage.getByRole('dialog', { name: '저장한 초안 게시' });
            await expect(dialog.getByText(/로그인한 모든 사용자/)).toBeVisible();
            await dialog.getByRole('textbox', { name: /변경 설명/ }).fill('E2E 첫 게시');
            await dialog.getByRole('button', { name: '게시', exact: true }).click();
            await expect(dialog).toBeHidden();
            await expect(adminPage.getByText('지금 사용자에게 보이는 게시본 v1')).toBeVisible();
        });
        // 아래에서 관리 화면을 새로 고치기 전에, 그 화면이 보낸 /api 요청이 끝나기를 기다린다(끊긴 요청은 오류 감시가 결함으로 본다).
        const adminRequests = trackApiRequests(adminPage);
        await test.step('Admin: 게시 이력과 새 창의 게시본으로 게시 결과를 확인한다', async () => {
            // 게시 이력은 서버가 남긴 게시본(변경 설명·본문)을 읽어 보인다.
            await adminPage.getByRole('button', { name: '게시 이력 1', exact: true }).click();
            const history = adminPage.getByRole('dialog', { name: '게시 이력' });
            await expect(history.getByRole('listitem').filter({ hasText: 'E2E 첫 게시' })).toContainText('지금 보이는 게시본');
            await history.getByRole('button', { name: 'v1 보기', exact: true }).click();
            await expect(history.getByRole('heading', { name: `v1 ${title}`, exact: true })).toBeVisible();
            await expect(history).toContainText(`E2E 안내 본문 ${stamp}`);
            await adminPage.keyboard.press('Escape');
            await expect(history).toBeHidden();
            // '게시본 열기' 는 새 창으로 사용자 주소를 연다.
            const [published] = await Promise.all([
                adminPage.context().waitForEvent('page'),
                adminPage.getByRole('link', { name: '게시본 열기' }).click(),
            ]);
            await expect(published).toHaveURL(new RegExp(`/pages/${slug}$`));
            await expect(published.getByRole('article').getByRole('heading', { level: 1, name: title })).toBeVisible();
            await expect(published.getByRole('article').getByText(summary)).toBeVisible();
            await published.close();
        });
        await test.step('User: 주소로 게시본을 읽는다', async () => {
            await userPage.goto(`/pages/${slug}`);
            const article = userPage.getByRole('article');
            await expect(article.getByRole('heading', { level: 1, name: title })).toBeVisible();
            await expect(article.getByText(summary)).toBeVisible();
            await expect(article.getByText(`E2E 안내 본문 ${stamp}`)).toBeVisible();
            await expect(article.getByRole('heading', { level: 2, name: '진행 순서' })).toBeVisible();
            await expect(article.getByRole('listitem').filter({ hasText: '신청 내용 작성' })).toBeVisible();
        });
        await test.step('User: 메뉴가 없어도 안내 페이지 목록에서 찾는다', async () => {
            await userPage.goto('/pages');
            // Wait for the initial list before submitting another query; otherwise its in-flight API request is cancelled.
            await expect(userPage.getByRole('link', { name: title, exact: true })).toBeVisible();
            const search = userPage.getByRole('search', { name: '안내 페이지 찾기' });
            await search.getByRole('textbox', { name: '제목·요약' }).fill(title);
            const [filteredResponse] = await Promise.all([
                userPage.waitForResponse(response => {
                    const url = new URL(response.url());
                    return response.request().method() === 'GET' && url.pathname === '/api/v1/content-pages' && url.searchParams.get('keyword') === title;
                }),
                search.getByRole('button', { name: '조회' }).click(),
            ]);
            expect(filteredResponse.ok()).toBeTruthy();
            await expect(userPage.getByText(`"${title}" 검색 결과 1건`, { exact: true })).toBeVisible();
            await expect(userPage.getByRole('link', { name: title })).toBeVisible();
        });
        await test.step('Admin: 목록에서 주소로 찾아 그 페이지를 다시 고른다', async () => {
            // 새로 열면 고른 페이지가 비워진다 — 목록에서 찾아 다시 고르고, 다음 단계가 그 편집 영역을 쓴다.
            await adminRequests.settled(adminPage.locator('body'));
            await adminPage.reload();
            const finder = adminPage.getByRole('search', { name: '콘텐츠 페이지 찾기' });
            const pageItems = adminPage.locator('[data-a2-master-item]');
            // 조건 없는 첫 목록(최근 수정 순)에 방금 게시한 페이지가 서버 값(주소·게시 상태)으로 보인다.
            const publishedItem = pageItems.filter({ hasText: `/pages/${slug}` });
            await expect(publishedItem).toContainText(title);
            await expect(publishedItem).toContainText(/게시 중(?!지)/);
            await waitForHydration(finder.getByRole('textbox', { name: '제목 또는 주소' }));
            const searchPages = async (keyword: string) => {
                await finder.getByRole('textbox', { name: '제목 또는 주소' }).fill(keyword);
                const [listed] = await Promise.all([
                    adminPage.waitForResponse(response => {
                        const url = new URL(response.url());
                        return response.request().method() === 'GET' && url.pathname === '/api/v1/admin/system/content-pages'
                            && url.searchParams.get('keyword') === keyword;
                    }),
                    finder.getByRole('button', { name: '조회', exact: true }).click(),
                ]);
                expect(listed.ok()).toBeTruthy();
            };
            // 맞는 페이지가 없는 검색어로 목록이 비는 것을 먼저 보아, 아래 결과가 검색으로 거른 것임을 확인한다.
            await searchPages(`${slug}-none`);
            await expect(adminPage.getByText('조건에 맞는 페이지가 없습니다.', { exact: true })).toBeVisible();
            await expect(pageItems).toHaveCount(0);
            await searchPages(slug);
            await expect(pageItems).toHaveCount(1);
            await expect(pageItems).toContainText(title);
            await expect(pageItems).toContainText(`/pages/${slug}`);
            await pageItems.click();
            await expect(adminPage.getByTestId('master-detail-detail').getByRole('textbox', { name: /페이지 제목/ })).toHaveValue(title);
        });
        await test.step('Admin: 게시를 멈추고 보관하면 사용자에게 없는 페이지다', async () => {
            // 목록의 상태 필터에도 같은 이름('보관')의 단추가 있다 — 편집 영역 안의 단추만 누른다.
            const editor = adminPage.getByTestId('master-detail-detail');
            await editor.getByRole('button', { name: '게시 중지' }).click();
            await adminPage.getByRole('dialog', { name: '게시 중지' }).getByRole('button', { name: '게시 중지' }).click();
            await expect(editor.getByText('사용자에게 보이는 게시본이 없습니다')).toBeVisible();
            await editor.getByRole('button', { name: '보관', exact: true }).click();
            await adminPage.getByRole('dialog', { name: '보관' }).getByRole('button', { name: '보관', exact: true }).click();
            await expect(adminPage.getByText('보관한 페이지입니다. 고치거나 게시하려면 보관을 해제하세요.')).toBeVisible();
            await userPage.goto(`/pages/${slug}`);
            await expect(userPage.getByRole('heading', { level: 1, name: '없거나 게시되지 않은 페이지입니다' })).toBeVisible();
        });
    });
});
test.describe('레거시 진입 경로', () => {
    /**
     * Business Extensions
     * 특화 비즈니스 모듈(약식결재, 간부일정, 도움말콘텐츠)에 대한 정밀 검증
     */
    test.describe('Business Extensions & Identity Governance', () => {
        test.use({ storageState: 'playwright/.auth/admin.json' });
        // [2026-07-17] LSM(간부일정) 도메인 제거 — 0행·계약파손·사경화 실측(A그룹 leader b). 케이스 삭제.
        test("도움말 콘텐츠 관리 화면의 제목을 표시한다", async ({ businessPage }) => {
            await businessPage.gotoHpcm();
            await expect(businessPage.page.getByRole('heading', {
                level: 1,
                name: '도움말 콘텐츠 관리(HPCM)',
            })).toBeVisible();
            await expect(businessPage.page.getByRole('table', {
                name: '도움말 콘텐츠 목록',
            })).toBeVisible();
        });
    });
});
