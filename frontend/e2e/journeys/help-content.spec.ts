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
                await expect(adminPage.locator('input[name="pstTtl"]')).toBeVisible();
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
