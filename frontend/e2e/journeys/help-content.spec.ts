import { expect,test } from '../fixtures/browser-test';
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
                const searchInput = userPage.getByPlaceholder(/검색|Search/i);
                await searchInput.fill(faqQuestion);
                await searchInput.press('Enter');
                await expect(userPage.getByText(faqQuestion).first()).toBeVisible({ timeout: 10000 });
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
