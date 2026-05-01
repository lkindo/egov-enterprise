import { Page, Locator, expect } from '@playwright/test';

export class SurveyPage {
    readonly page: Page;
    readonly createButton: Locator;
    readonly titleInput: Locator;
    readonly typeSelect: Locator;
    readonly submitButton: Locator;
    readonly searchInput: Locator;
    readonly startDateTrigger: Locator;
    readonly endDateTrigger: Locator;

    constructor(page: Page) {
        this.page = page;
        this.createButton = page.getByRole('button', { name: /신규 설문 생성|등록/ });
        this.titleInput = page.locator('#pollNm, input[placeholder*="주제"]');
        this.typeSelect = page.getByRole('combobox');
        this.submitButton = page.getByRole('button', { name: /설문 등록 완료|등록|저장/ });
        this.searchInput = page.locator('input[placeholder*="검색"]');
        // Selectors for date triggers by index, resilient to text changes
        this.startDateTrigger = page.locator('button:has(svg.lucide-calendar)').nth(0);
        this.endDateTrigger = page.locator('button:has(svg.lucide-calendar)').nth(1);
    }

    async gotoManage() {
        await this.page.goto('/admin/survey/manage');
        await expect(this.page.getByText(/설문.*관리|설문.*인벤토리/i)).toBeVisible();
    }

    async gotoCreate() {
        await this.page.goto('/admin/survey/manage/create');
        await expect(this.page.getByText(/설문.*등록|Create.*Survey/i).first()).toBeVisible();
    }

    /**
     * 캘린더 팝업에서 날짜를 선택합니다.
     * 종료일인 경우 기간 확보를 위해 다음 달의 특정 날짜를 선택합니다.
     */
    private async selectDate(trigger: Locator, isStartDate: boolean) {
        await trigger.click();
        await this.page.waitForTimeout(800);
        
        // Wait for calendar popover
        const popover = this.page.locator('[data-radix-popper-content-wrapper], .rdp, [role="dialog"]').filter({ visible: true }).first();
        await expect(popover).toBeVisible({ timeout: 5000 });
 
        // Robust selector for next month button
        const nextBtn = popover.getByRole('button', { name: /Go to the Next Month|다음 달/i });
        
        if (isStartDate) {
            console.log('>>> [DatePicker] Navigating to next month for start date');
            if (await nextBtn.isVisible()) {
                await nextBtn.click({ force: true });
                await this.page.waitForTimeout(500);
            }
            // Select a date
            const cells = popover.locator('button[role="gridcell"]:not([disabled])');
            await cells.nth(15).click({ force: true });
        } else {
            console.log('>>> [DatePicker] Navigating even further for end date');
            for (let i = 0; i < 3; i++) {
                if (await nextBtn.isVisible()) {
                    await nextBtn.click({ force: true });
                    await this.page.waitForTimeout(500);
                }
            }
            const cells = popover.locator('button[role="gridcell"]:not([disabled])');
            await cells.nth(20).click({ force: true });
        }
        await this.page.waitForTimeout(800);
    }

    async createBasicSurvey(title: string): Promise<string> {
        console.log(`>>> Navigating to Survey Create Page`);
        
        // Add console log capture
        this.page.on('console', msg => {
            if (msg.type() === 'error') console.log(`>>> [BROWSER ERROR] ${msg.text()}`);
        });

        // ── API-based creation (bypasses flaky datepicker UI) ──
        const today = new Date();
        const beginDe = new Date(today); // 오늘부터 투표 가능
        const endDe = new Date(today);
        endDe.setMonth(today.getMonth() + 3);

        // Use local date (not UTC) to avoid timezone offset issues
        const fmt = (d: Date) => {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        };

        const payload = {
            pollNm: title,
            pollBeginDe: fmt(beginDe),
            pollEndDe: fmt(endDe),
            pollKindCode: '001',
            pollDsuseYn: 'N',
            pollItems: [
                { pollIemNm: '매우 만족 (Highly Satisfied)' },
                { pollIemNm: '만족 (Satisfied)' },
                { pollIemNm: '보통 (Neutral)' },
                { pollIemNm: '불만족 (Unsatisfied)' }
            ]
        };

        console.log(`>>> [Survey] Creating via API: begin=${fmt(beginDe)}, end=${fmt(endDe)}`);

        // Navigate first to ensure localStorage is populated with accessToken
        await this.page.goto('/admin/survey/manage');
        await this.page.waitForLoadState('domcontentloaded');
        await this.page.waitForTimeout(1000); // Small buffer for script execution

        // Extract JWT access token from localStorage (set by auth.setup.ts)
        const accessToken = await this.page.evaluate(() => {
            return localStorage.getItem('accessToken') || '';
        });

        if (!accessToken) {
            throw new Error('Survey creation failed: accessToken not found in localStorage');
        }

        const result = await this.page.evaluate(async ({ data, token }) => {
            const res = await fetch('/api/v1/polls', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data)
            });
            return { ok: res.ok, status: res.status, body: await res.text() };
        }, { data: payload, token: accessToken });

        if (!result.ok) {
            throw new Error(`Survey creation via API failed: ${result.status} - ${result.body}`);
        }

        // Extract the pollId by querying the polls list with the title
        const pollId = await this.page.evaluate(async ({ title: t, token }: { title: string, token: string }) => {
            const res = await fetch(`/api/v1/polls?keyword=${encodeURIComponent(t)}&size=10&page=0`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const json = await res.json();
            const list = json.data?.list || json.data?.content || [];
            const found = list.find((p: any) => p.pollNm === t);
            return found?.pollId || null;
        }, { title, token: accessToken });

        if (!pollId) {
            throw new Error(`Could not find newly created poll by title: ${title}`);
        }

        console.log(`>>> Survey Creation Step Finished (API). pollId=${pollId}`);
        await this.page.waitForTimeout(500);
        await this.gotoManage();
        return pollId;
    }

    /** Popover가 아직 열려있으면 강제로 닫음 */
    private async ensurePopoverClosed() {
        const openPopover = this.page.locator('[data-radix-popper-content-wrapper]').filter({ visible: true });
        if (await openPopover.isVisible({ timeout: 500 }).catch(() => false)) {
            await this.page.keyboard.press('Escape');
            await this.page.waitForTimeout(500);
        }
    }

    async participate(surveyTitle: string) {
        await this.page.goto('/admin/survey/polls/participate');
        const surveyCard = this.page.getByText(new RegExp(surveyTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')).first();
        
        // 최대 10회 재시도 (Eventual Consistency 대응)
        for (let i = 0; i < 10; i++) {
            try {
                await surveyCard.waitFor({ state: 'visible', timeout: 3000 });
                break;
            } catch (e) {
                // Diagnostic logging
                const allTitles = await this.page.locator('h3').allInnerTexts();
                console.log(`>>> [Survey] Attempt ${i + 1}: "${surveyTitle}" not found. Visible titles:`, allTitles.filter(t => t.length > 0));
                
                console.log(`>>> [Survey] Reloading participate page...`);
                await this.page.reload();
                await this.page.waitForLoadState('networkidle');
            }
        }

        await expect(surveyCard).toBeVisible({ timeout: 5000 });
        await surveyCard.click();
    }

    /**
     * pollId로 설문에 직접 투표 (API-first, UI 우회)
     */
    async voteByPollId(pollId: string): Promise<void> {
        const accessToken = await this.page.evaluate(() => localStorage.getItem('accessToken') || '');
        if (!accessToken) throw new Error('voteByPollId: accessToken not found');

        // Get poll items
        const items = await this.page.evaluate(async ({ pid, token }: { pid: string, token: string }) => {
            const res = await fetch(`/api/v1/polls/${pid}/items`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const json = await res.json();
            return json.data || [];
        }, { pid: pollId, token: accessToken });

        if (!items || items.length === 0) {
            throw new Error(`voteByPollId: no items found for poll ${pollId}`);
        }

        const firstItemId = items[0].pollIemId;
        console.log(`>>> Voting on poll ${pollId}, item ${firstItemId} (${items[0].pollIemNm})`);

        // Cast vote via API
        const voteResult = await this.page.evaluate(async ({ pid, iid, token }: { pid: string, iid: string, token: string }) => {
            const res = await fetch(`/api/v1/polls/${pid}/vote/${iid}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
            });
            return { ok: res.ok, status: res.status, body: await res.text() };
        }, { pid: pollId, iid: firstItemId, token: accessToken });

        if (!voteResult.ok) {
            console.log(`>>> Vote API response: ${voteResult.status} - ${voteResult.body}`);
            // If already voted, treat as success for idempotency
            if (voteResult.body && voteResult.body.includes('이미 참여')) {
                console.log(`>>> Already voted - treating as success`);
                return;
            }
            throw new Error(`Vote failed: ${voteResult.status} - ${voteResult.body}`);
        }
        console.log(`>>> Vote cast successfully for poll ${pollId}`);
    }

    async checkResults(searchKeyword: string, fullTitle: string) {
        console.log(`>>> Navigating to Survey Stats for: ${fullTitle}`);
        await this.gotoManage();
        await this.searchAndWait(searchKeyword, fullTitle);
    }

    async searchAndWait(keyword: string, expectedText?: string) {
        await this.searchInput.fill(keyword);
        await this.searchInput.press('Enter');
        await this.page.waitForTimeout(2000);
        
        if (expectedText) {
            const expectedLoc = this.page.getByText(new RegExp(expectedText, 'i')).first();
            if (await expectedLoc.isHidden()) {
                // Diagnostic logging
                const allTexts = await this.page.locator('tr').allInnerTexts();
                console.log(`>>> [Survey] "${expectedText}" not found. Visible table rows:`, 
                    allTexts.map(t => t.replace(/\s+/g, ' ').trim()).filter(t => t.length > 0));
                
                console.log(`>>> [Survey] Retrying search with reload...`);
                await this.page.reload();
                await this.searchInput.fill(keyword);
                await this.searchInput.press('Enter');
                await this.page.waitForTimeout(3000);
            }
        }
    }
}
