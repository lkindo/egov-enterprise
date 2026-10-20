import { type APIRequestContext, type Locator, type Page } from '@playwright/test';
import { expect,test } from '../fixtures/browser-test';
test.describe('협업 도구', () => {
    /**
     * Advanced Collaboration & Intelligence
     * 실제 UI 상호작용을 통한 협업 도구 및 지능형 분석 기능 검증
     */
    test.describe('Advanced Collaboration & Intelligence', () => {
        test.use({
            storageState: 'playwright/.auth/admin.json',
            viewport: { width: 1920, height: 1080 }
        });
        test("접속 통계 차트를 새로고침하고 CSV를 내려받는다", async ({ statsPage }) => {
            console.log('\n>>> Starting Intelligence: Dashboard Validation');
            await statsPage.goto();
            await statsPage.verifyChartsVisible();
            // [2026-07-27] 종전의 `changePeriod('MONTHLY_BATCH (30D)')` 를 걷어냈다 — 그 셀렉트는
            // onChange 없는 장식 컨트롤이었고 감사 P0(4dcee3014)에서 제거됐다. 상세는 StatsPage 주석.
            await statsPage.refresh();
            // 엑셀 내보내기 검증
            console.log('>>> Verifying Excel Export capability');
            const download = await statsPage.exportExcel();
            // [2026-07-27 정정] 기대 파일명이 'system_intelligence_stats' 로 굳어 있었으나 실제 산출물은
            // `system_connect_stats_YYYY-MM-DD.csv` 다(AdminStatsClient 의 DataExportExcel filename).
            // 접속 집계를 내보내는 버튼이므로 현행 이름이 내용과 더 맞는다 — 단언을 실물에 맞춘다.
            expect(download.suggestedFilename()).toContain('system_connect_stats');
        });
    });
});
test.describe('운영 관측', () => {
    test.describe('System Observability & Intelligence', () => {
        test.use({ storageState: 'playwright/.auth/admin.json' });
        test("사용자 통계와 콘텐츠 지표 화면 제목을 표시한다", async ({ page }) => {
            console.log('>>> [Observability] Navigating to Visitor Stats');
            await page.goto('/admin/stats/user');
            await expect(page.getByRole('heading', { level: 1, name: '사용자 통계 분석', exact: true })).toBeVisible({ timeout: 15000 });
            console.log('>>> [Observability] Navigating to Content Stats');
            await page.goto('/admin/stats/board');
            await expect(page.getByRole('heading', { level: 1, name: '콘텐츠 지표 분석', exact: true })).toBeVisible({ timeout: 15000 });
        });

        /*
         * [2026-10-20] 통계 시계열은 서버가 {date, value} 오름차순으로 내고, 측정하는 계열은 기간의 빈 날을 0 으로 채운다. 이 여정은 화면
         * 값을 단언한다 — 기간을 바꾸면 원본 표·차트 축·요약이 그 기간으로 바뀌고, 기록이 없는 날은 행이 빠지지 않고 0 으로 보인다.
         *
         * 근거 데이터: 격리 E2E 는 매 실행 새 DB 를 만든다(CTX-020) — 로그인 기록·사용자 활동은 이 실행의 인증 준비(auth.setup)와 시험들이
         * 남긴 것뿐이라 실행 전의 날(7~9일 전)은 반드시 0 이다. 오늘 값은 다른 시험이 같은 DB 에 동시에 로그인·요청할 수 있어(CI workers=2)
         * 고정 수를 단언하지 않고, 같은 순간의 API 응답과 화면이 같아질 때까지 새로고침해 대조한다.
         * 날짜는 앱과 같은 Asia/Seoul 기준이다 — 러너(UTC)의 날짜로 만들면 KST 자정~09시에 하루가 갈린다.
         */
        test("기간을 바꾸면 성공 로그인·사용자 활동의 표와 차트가 그 기간으로 바뀌고 기록이 없는 날은 0 이다", async ({ page, adminRequest }) => {
            const seoulDay = (offsetDays: number) => new Intl.DateTimeFormat('en-CA', {
                timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
            }).format(new Date(Date.now() + offsetDays * 86_400_000));
            const quiet = [seoulDay(-9), seoulDay(-8), seoulDay(-7)];
            const today = seoulDay(0);

            await page.goto('/admin/stats/screen');
            await expect(page.getByRole('heading', { level: 1, name: '시스템 활성 지표', exact: true })).toBeVisible({ timeout: 15000 });

            // 1) 실행 전의 사흘 — 기록이 없는 날도 행이 있고 값은 0 이다.
            await applyPeriod(page, quiet[0], quiet[2]);
            await expectRows(page, quiet.map((date) => [date, '0']));
            await expect(summaryValue(page, '기간 합계')).toHaveText('0');
            await expect(summaryValue(page, '가장 많은 날')).toHaveText('없음');
            await expect(page.getByTestId('report-basis')).toContainText(`집계 구간: ${quiet[0]} ~ ${quiet[2]}`);
            // 차트는 표와 같은 계열 하나를 그린다 — 축 눈금의 순서·형식은 단위 시험(IntelligenceHubClient.time-axis)이 보고,
            //   여기서는 차트 내부 클래스 이름에 기대지 않는다.

            // 2) 오늘 — 같은 순간의 API 응답과 화면의 표·요약이 같다.
            await applyPeriod(page, today, today);
            await expectMatchesApi(page, adminRequest, '/api/v1/admin/system/statistics/connect', today, (data) => data);

            // 3) 사용자 활동 — 요청 구분을 고르면 표가 그 계열이다. 실행 전의 날은 어느 계열이든 0 이다.
            await page.getByRole('navigation', { name: '통계 분석 뷰' }).getByRole('button', { name: /사용자 통계$/ }).click();
            await expect(page.getByRole('heading', { level: 1, name: '사용자 통계 분석', exact: true })).toBeVisible({ timeout: 15000 });
            await applyPeriod(page, quiet[0], quiet[2]);
            const picker = page.getByRole('group', { name: '요청 구분' });
            await picker.getByRole('button', { name: '수정 요청', exact: true }).click();
            await expect(picker.getByRole('button', { name: '수정 요청', exact: true })).toHaveAttribute('aria-pressed', 'true');
            await expect(page.getByRole('columnheader', { name: '수정 요청 건수' })).toBeVisible();
            await expectRows(page, quiet.map((date) => [date, '0']));
            await picker.getByRole('button', { name: '조회 요청', exact: true }).click();
            await applyPeriod(page, today, today);
            await expectMatchesApi(page, adminRequest, '/api/v1/admin/system/statistics/user', today,
                (data) => (data as { inqCnt: unknown }).inqCnt);

            // 4) 통계 개요로 되돌아간다 — 같은 내비게이션이 개요에도 있다.
            await page.getByRole('navigation', { name: '통계 분석 뷰' }).getByRole('button', { name: /통계 개요$/ }).click();
            await expect(page.getByRole('heading', { level: 1, name: '관리자 통계', exact: true })).toBeVisible({ timeout: 15000 });
            await expect(page.getByRole('navigation', { name: '통계 분석 뷰' }).getByRole('button', { name: /통계 개요$/ }))
                .toHaveAttribute('aria-current', 'page');
        });
    });
});

/**
 * 집계 기간을 직접 입력하고 화면이 그 기간을 집계 구간으로 말할 때까지 기다린다. 같은 기간을 이미 받아 두었으면(화면을 열 때의
 * '최근 1일'이 곧 오늘 하루다) 새 요청이 나가지 않으므로 네트워크 응답을 기다리지 않는다 — 값은 뒤의 표·API 대조가 본다.
 */
async function applyPeriod(page: Page, from: string, to: string) {
    await page.getByLabel('집계 기간 시작일').fill(from);
    await page.getByLabel('집계 기간 종료일').fill(to);
    await expect(page.getByTestId('report-basis')).toContainText(`집계 구간: ${from} ~ ${to}`, { timeout: 20_000 });
}

/** 원본 표의 [일자, 건수] 행. */
function sourceRows(page: Page): Locator {
    return page.getByTestId('report-source-table').getByRole('table').getByRole('row').filter({ has: page.getByRole('cell') });
}

async function expectRows(page: Page, rows: string[][]) {
    await expect(sourceRows(page)).toHaveCount(rows.length);
    for (const [index, cells] of rows.entries()) {
        await expect(sourceRows(page).nth(index).getByRole('cell')).toHaveText(cells);
    }
}

function summaryValue(page: Page, title: string): Locator {
    return page.getByTestId('report-summary').getByText(title, { exact: true }).locator('xpath=following-sibling::*[1]');
}

/**
 * 오늘 하루의 화면 값이 같은 순간의 API 응답과 같다. 다른 시험이 동시에 로그인·요청하면 두 읽기 사이에 값이 늘 수 있으므로,
 * 새로고침해 다시 읽고 같아질 때까지 기다린다. 오늘은 기간 안이라 행이 정확히 하나다(빈 날 채우기는 오늘에서 멈춘다).
 */
async function expectMatchesApi(
    page: Page,
    adminRequest: APIRequestContext,
    apiPath: string,
    today: string,
    series: (data: unknown) => unknown,
) {
    await expect(async () => {
        await page.getByRole('button', { name: /통계 새로고침$/ }).click();
        const response = await adminRequest.get(apiPath, { params: { fromDate: today, toDate: today } });
        expect(response.status()).toBe(200);
        const points = series((await response.json()).data) as { date: string; value: number }[];
        expect(points).toEqual([{ date: today, value: expect.any(Number) }]);
        const value = points[0].value.toLocaleString('en-US');
        await expect(sourceRows(page)).toHaveCount(1, { timeout: 3000 });
        await expect(sourceRows(page).first().getByRole('cell')).toHaveText([today, value], { timeout: 3000 });
        await expect(summaryValue(page, '기간 합계')).toHaveText(value, { timeout: 3000 });
    }).toPass({ timeout: 45_000 });
}
