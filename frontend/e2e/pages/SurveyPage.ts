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
        // [2026-08-22 정정] `/admin/survey/manage` 는 next.config.ts:130 이 허브로 redirect 한다.
        //   정본 URL 을 직접 열어 redirect 왕복을 없앤다.
        await this.page.goto('/admin/survey/hub?tab=manage');
        // [2026-07-27 정정] 종전 getByText(/설문.*관리/).first() 는 **전역 메가메뉴의 숨겨진 링크**
        // '설문 및 여론조사 관리' 를 DOM 순서상 먼저 집었다. 그 요소는 접힌 메뉴 안이라 영원히 visible 이
        // 되지 않아 60초 타임아웃으로 죽었다(페이지는 정상 렌더됐다). 페이지 자신의 heading 으로 단언한다.
        // [2026-08-22 정정] 종전 '설문 및 거버넌스 관리' 는 SurveyManageClient 의 PageHeader 였는데,
        //   허브가 `<SurveyManageClient embedded />` 로 마운트하면서 그 PageHeader 를 렌더하지 않는다.
        //   이는 회귀가 아니라 **h1 중복 제거**다(종전에는 허브 h1 과 함께 2개가 떴고 테스트가 그
        //   중복에 의존했다). shell-accessibility-contract.test.ts 가 embedded 를 계약으로 고정한다.
        //   실제 도달 화면의 h1(hub/page.tsx:42)으로 단언한다.
        await expect(this.page.getByRole('heading', { name: '설문 통합 관리 워크벤치', exact: true })).toBeVisible({ timeout: 30000 });
    }

    async gotoCreate() {
        await this.page.goto('/admin/survey/manage/create');
        await expect(this.page.getByText(/설문.*등록|Create.*Survey/i).first()).toBeVisible();
    }

    // [2026-08-10 제거] `selectDate(trigger, isStartDate)` — 호출부가 하나도 없는 死코드였다.
    //   E2E 전용 타입 게이트(tsconfig.e2e.json)를 신설한 첫 실행에서 검출됐다. 종전에는
    //   루트 tsconfig 가 `e2e` 를 exclude 해 이런 선언이 영구히 보이지 않았다.
    //   내용도 캘린더 좌표('15번째 셀', '다음 달 3번 클릭')에 의존해 되살릴 가치가 없다 —
    //   기간 입력이 다시 필요해지면 날짜를 직접 채우는 방식으로 새로 쓴다.

    async createBasicSurvey(title: string): Promise<number> {
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
            return `${y}${m}${day}`; // YYYYMMDD (8 chars)
        };

        const payload = {
            pollNm: title,
            pollBgngYmd: fmt(beginDe),
            pollEndYmd: fmt(endDe),
            pollKndCd: '001',
            pollDsuseYn: 'N',
            pollArticles: [
                { pollArtclNm: '매우 만족 (Highly Satisfied)' },
                { pollArtclNm: '만족 (Satisfied)' },
                { pollArtclNm: '보통 (Neutral)' },
                { pollArtclNm: '불만족 (Unsatisfied)' }
            ]
        };

        console.log(`>>> [Survey] Creating via API: begin=${fmt(beginDe)}, end=${fmt(endDe)}`);

        // 인증된 페이지로 이동. 동일출처 /api/v1 fetch 는 미들웨어가 HttpOnly accessToken 쿠키에서
        // Bearer 를 주입하므로 토큰을 수동 추출/첨부하지 않는다(HttpOnly 전환 정합).
        await this.page.goto('/admin/survey/manage');
        await this.page.waitForLoadState('domcontentloaded');

        const result = await this.page.evaluate(async ({ data }) => {
            const res = await fetch('/api/v1/polls', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            return { ok: res.ok, status: res.status, body: await res.text() };
        }, { data: payload });

        if (!result.ok) {
            throw new Error(`Survey creation via API failed: ${result.status} - ${result.body}`);
        }

        // 제목으로 목록을 조회해 DB가 생성한 pollSn을 찾는다.
        const pollSn = await this.page.evaluate(async ({ title: t }: { title: string }) => {
            const res = await fetch(`/api/v1/polls?keyword=${encodeURIComponent(t)}&size=10&page=0`);
            const json = await res.json();
            const list = json.data?.list || json.data?.content || [];
            const found = list.find((p: any) => p.pollNm === t);
            return found?.pollSn || null;
        }, { title });

        if (!pollSn) {
            throw new Error(`Could not find newly created poll by title: ${title}`);
        }

        console.log(`>>> Survey Creation Step Finished (API). pollSn=${pollSn}`);
        await this.gotoManage();
        return pollSn;
    }

    // [2026-08-10 제거] `ensurePopoverClosed()` — 위 selectDate 와 함께 남은 死코드(호출부 0).
    //   달력 팝오버를 쓰지 않게 된 뒤로 존재 이유가 사라졌다.

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
     * pollSn으로 설문에 직접 투표 (API-first, UI 우회)
     */
    async voteByPollSn(pollSn: number): Promise<void> {
        // 동일출처 /api/v1 fetch 는 미들웨어가 HttpOnly 쿠키에서 Bearer 를 주입한다(수동 토큰 불요).
        // Get poll items
        const items = await this.page.evaluate(async ({ pid }: { pid: number }) => {
            const res = await fetch(`/api/v1/polls/${pid}/items`);
            const json = await res.json();
            return json.data || [];
        }, { pid: pollSn });

        if (!items || items.length === 0) {
            throw new Error(`voteByPollSn: no items found for poll ${pollSn}`);
        }

        const firstItemSn = items[0].pollArtclSn;
        console.log(`>>> Voting on poll ${pollSn}, item ${firstItemSn} (${items[0].pollArtclNm})`);

        // Cast vote via API
        const voteResult = await this.page.evaluate(async ({ pid, iid }: { pid: number, iid: number }) => {
            const res = await fetch(`/api/v1/polls/${pid}/vote/${iid}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            return { ok: res.ok, status: res.status, body: await res.text() };
        }, { pid: pollSn, iid: firstItemSn });

        if (!voteResult.ok) {
            console.log(`>>> Vote API response: ${voteResult.status} - ${voteResult.body}`);
            // If already voted, treat as success for idempotency
            if (voteResult.body && voteResult.body.includes('이미 참여')) {
                console.log(`>>> Already voted - treating as success`);
                return;
            }
            throw new Error(`Vote failed: ${voteResult.status} - ${voteResult.body}`);
        }
        console.log(`>>> Vote cast successfully for poll ${pollSn}`);
    }

    async checkResults(searchKeyword: string, fullTitle: string) {
        console.log(`>>> Navigating to Survey Stats for: ${fullTitle}`);
        await this.gotoManage();
        await this.searchAndWait(searchKeyword, fullTitle);
    }

    async searchAndWait(keyword: string, expectedText?: string) {
        console.log(`>>> [Survey] Searching for: ${keyword}`);
        
        for (let i = 0; i < 3; i++) {
            await this.searchInput.fill(keyword);
            const searchBtn = this.page.getByRole('button', { name: /SEARCH/i }).first();
            if (await searchBtn.isVisible()) {
                await searchBtn.click();
            } else {
                await this.searchInput.press('Enter');
            }
            
            if (expectedText) {
                const expectedLoc = this.page.getByText(expectedText).first();
                if (await expectedLoc.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false)) {
                    console.log(`>>> [Survey] Found expected text: ${expectedText}`);
                    return;
                }
                console.log(`>>> [Survey] Attempt ${i+1}: "${expectedText}" not found, reloading...`);
                await this.page.reload();
                await this.page.waitForLoadState('domcontentloaded');
            } else {
                return;
            }
        }
        
        if (expectedText) {
            throw new Error(`Survey search failed: "${expectedText}" not found after retries.`);
        }
    }
}
