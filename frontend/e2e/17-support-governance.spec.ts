import { test, expect } from './fixtures/base-test';
import { SupportPage } from './pages/SupportPage';

test.describe('Tier 17: Support & Service Governance', () => {
    test.use({ storageState: 'playwright/.auth/admin.json' });

    test('Support: Online Manual Full Lifecycle', async ({ page }) => {
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

    test('Support: FAQ Lifecycle Management', async ({ page }) => {
        const supportPage = new SupportPage(page);
        const faqTitle = `E2E FAQ ${Date.now()}`;

        await test.step('Admin: Create FAQ', async () => {
            await supportPage.gotoFAQ();
            await supportPage.createKnowledgeEntry(faqTitle, 'This is a test FAQ answer for support governance.');
        });

        await test.step('Admin: Search and Verify FAQ', async () => {
            await supportPage.gotoFAQ();
            const searchInput = page.locator('input[placeholder*="검색"]').first();
            await searchInput.fill(faqTitle);
            await page.keyboard.press('Enter');
            await expect(page.getByText(faqTitle).first()).toBeVisible({ timeout: 15000 });
        });
    });

    test('Support: Q&A Interaction & Resolution', async ({ page }) => {
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
