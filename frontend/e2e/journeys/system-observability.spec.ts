import { randomBytes } from 'node:crypto';
import { type APIRequestContext, type Locator, type Page } from '@playwright/test';
import { expect,test } from '../fixtures/browser-test';
import { waitForHydration } from '../fixtures/hydration';
import { screenDate, screenYmd } from '../helpers/screen-date';
import { ObservabilityPage } from '../pages/ObservabilityPage';
test.describe('System Observability & Intelligence', () => {
    test.use({ storageState: 'playwright/.auth/admin.json' });
    let obsPage: ObservabilityPage;
    test.beforeEach(async ({ page }) => {
        obsPage = new ObservabilityPage(page);
        await obsPage.navigate();
    });
    test("모니터링 제목과 CPU·메모리 지표를 표시한다", async () => {
        await obsPage.verifyHeader();
        await obsPage.verifyMetrics();
        // Verify specific metrics are visible
        const page = obsPage['page'];
        // 모니터링 허브 observability 탭의 실제 지표 라벨 (구 standalone 페이지 라벨은 라우트 통합으로 제거됨)
        await expect(page.getByText('CPU_LOAD', { exact: false }).first()).toBeVisible();
        await expect(page.getByText('MEMORY_ALLOC', { exact: false }).first()).toBeVisible();
        // [2026-11-09 DEC-OPS-409] NETWORK_TRAFFIC 는 고정 배열 표본이라 시연 기능의 하네스 탭으로 옮겼다 — 가동 상태 탭의 실측 지표가 아니다.
    });
    test("모니터링 새로고침 후 현재 조회 결과 반출 dialog를 연다", async () => {
        await obsPage.refresh();
        await obsPage.exportData();
        // exportData()가 연 '리포트 스냅샷' 모달 검증 (허브 실제 UI — 구 footer 브랜딩은 라우트 통합으로 제거됨)
        const page = obsPage['page'];
        // [2026-08-25] 모달 제목을 한국어로 정정했다(영문 마케팅 명칭 제거).
        await expect(page.getByRole('dialog', { name: '현재 조회 결과 반출' })).toBeVisible();
    });
});

/*
 * [2026-11-10] 로그 조회 여정 — 알려진 행동(권한 없는 요청)을 하고, 그 행동이 남긴 실패 요청 기록을 로그 화면이 조건대로 찾는지 본다.
 * 보안 필터가 거부한 요청은 핸들러가 없어 서비스 칸에 요청 경로가 남는다. 경로에 이 실행만의 표지를 넣어 다른 시험의 행과 섞이지
 * 않게 한다. 기록은 비동기 리스너가 쓰므로 API 로 도착을 기다린 뒤 화면을 연다. 로그는 지우는 경로가 없다(폐기용 DB 에 남는다).
 * 감사 여정(audit-log.spec.ts)은 벤더 증거 입력이라 같은 흐름을 여기 따로 둔다.
 */
test.describe('로그 조회 — 거부된 요청을 기록에서 찾는다', () => {
    test.use({ storageState: 'playwright/.auth/admin.json' });

    test('통합 로그에서 거부된 요청을 찾아 상세를 열고 새로고침하고 분류를 바꾼다', async ({ page, userRequest, adminRequest }) => {
        const marker = `E2ELOG${randomBytes(4).toString('hex').toUpperCase()}`;
        // 새로고침 단계에서 생기는 두 번째 기록 — 같은 검색어(marker)에 걸리고 이름으로 첫 기록과 갈린다.
        const later = `${marker}LATER`;
        await recordDeniedRequest(userRequest, adminRequest, marker);

        await page.goto('/admin/system/logs');
        await expect(page.getByRole('heading', { level: 1, name: '로그 통합 조회', exact: true })).toBeVisible({ timeout: 15000 });

        // 검색 — 시스템로그 분류에서 표지로 찾으면 서버가 그 조건으로 다시 읽고, 표에는 그 표지의 행만 남는다.
        const keyword = page.getByLabel('시스템로그 검색어');
        await waitForHydration(keyword);
        await keyword.fill(marker);
        await Promise.all([logsLoaded(page, 'system', marker), keyword.press('Enter')]);
        const rows = dataRows(page, '시스템로그 목록');
        const deniedRow = rows.filter({ hasText: deniedPath(marker) });
        await expect(deniedRow.first()).toBeVisible({ timeout: 20000 });
        await expect(rows.filter({ hasNotText: marker })).toHaveCount(0);

        // 상세 — 행의 상세 단추가 그 기록의 원본(서버가 준 값)을 보인다.
        await deniedRow.first().getByRole('button', { name: /^시스템로그 .+ 상세 열기$/ }).click();
        const detail = page.getByRole('dialog', { name: '로그 상세 정보' });
        await expect(detail).toContainText(deniedPath(marker));
        await expect(detail).toContainText(/"rspnsCd": "?403"?/);
        await page.keyboard.press('Escape');
        await expect(detail).toBeHidden();

        // 새로고침 — 화면을 연 뒤 생긴 기록은 새로고침 단추가 서버에 다시 물어야 표에 들어온다.
        await recordDeniedRequest(userRequest, adminRequest, later);
        await expect(rows.filter({ hasText: deniedPath(later) })).toHaveCount(0);
        await Promise.all([logsLoaded(page, 'system', marker), page.getByRole('button', { name: '새로고침', exact: true }).click()]);
        await expect(rows.filter({ hasText: deniedPath(later) }).first()).toBeVisible();
        await expect(rows.filter({ hasNotText: marker })).toHaveCount(0);

        // 분류 바꾸기 — 로그인로그로 바꾸면 그 분류의 API 로 다시 읽는다. 관리자 아이디로 찾으면 인증 준비가 남긴 관리자 로그인 기록이 나온다.
        const categories = page.getByRole('tablist', { name: '로그 카테고리' });
        await Promise.all([logsLoaded(page, 'login', marker), categories.getByRole('tab', { name: '로그인로그', exact: true }).click()]);
        await expect(categories.getByRole('tab', { name: '로그인로그', exact: true })).toHaveAttribute('aria-selected', 'true');
        const loginKeyword = page.getByLabel('로그인로그 검색어');
        await loginKeyword.fill('webmaster');
        await Promise.all([logsLoaded(page, 'login', 'webmaster'), loginKeyword.press('Enter')]);
        const loginRows = dataRows(page, '로그인로그 목록');
        await expect(loginRows.filter({ hasText: 'webmaster' }).first()).toBeVisible({ timeout: 20000 });
        await expect(loginRows.filter({ hasNotText: 'webmaster' })).toHaveCount(0);
    });

    test('실패 요청 로그를 검색하고 발생일자 기간으로 거르면 기간 밖에서는 빠진다', async ({ page, userRequest, adminRequest }) => {
        const marker = `E2ESYS${randomBytes(4).toString('hex').toUpperCase()}`;
        await recordDeniedRequest(userRequest, adminRequest, marker);

        await page.goto('/admin/system/logs/system');
        await expect(page.getByRole('heading', { level: 1, name: '시스템 로그', exact: true })).toBeVisible({ timeout: 15000 });

        // 검색 — 표지로 찾으면 그 기록이 경로·응답 코드와 함께 보이고, 표지가 없는 행은 없다.
        const search = page.getByLabel('서비스 설명 · 요청ID');
        await waitForHydration(search);
        await search.fill(marker);
        await Promise.all([logsLoaded(page, 'system', marker), search.press('Enter')]);
        const rows = dataRows(page, '시스템 로그 목록');
        const deniedRow = rows.filter({ hasText: deniedPath(marker) });
        await expect(deniedRow.first()).toBeVisible({ timeout: 20000 });
        await expect(deniedRow.first()).toContainText('403');
        await expect(rows.filter({ hasNotText: marker })).toHaveCount(0);

        // 기간 — 기록은 오늘(한국 날짜) 생겼다. 지난 사흘로 거르면 빠지고, 오늘로 거르면 돌아온다. 시작일이 종료일보다 늦은 순간을
        //   만들지 않도록 앞으로 옮길 때는 종료일을 먼저 바꾼다.
        const start = page.getByLabel('조회 기간(발생일자) 시작일');
        const end = page.getByLabel('조회 기간(발생일자) 종료일');
        await start.fill(screenDate(-9));
        await Promise.all([logsLoaded(page, 'system', marker, [screenYmd(-9), screenYmd(-7)]), end.fill(screenDate(-7))]);
        await expect(deniedRow).toHaveCount(0);
        await Promise.all([logsLoaded(page, 'system', marker, [screenYmd(-9), screenYmd(0)]), end.fill(screenDate(0))]);
        await Promise.all([logsLoaded(page, 'system', marker, [screenYmd(0), screenYmd(0)]), start.fill(screenDate(0))]);
        await expect(deniedRow.first()).toBeVisible();
        await expect(rows.filter({ hasNotText: marker })).toHaveCount(0);
    });
});

/** 보안 필터가 거부한 요청이 실패 요청 로그의 서비스 칸에 남기는 경로. */
function deniedPath(marker: string): string {
    return `/api/v1/admin/system/codes/cmmn/${marker}`;
}

/** 일반 사용자의 권한 없는 공통코드 조회(403)를 남기고, 실패 요청 로그에 도착할 때까지 기다린다. */
async function recordDeniedRequest(userRequest: APIRequestContext, adminRequest: APIRequestContext, marker: string) {
    const denied = await userRequest.get(deniedPath(marker));
    expect(denied.status(), '권한 없는 공통코드 조회').toBe(403);
    await expect.poll(async () => {
        const response = await adminRequest.get('/api/v1/admin/system/logs/system', { params: { searchKeyword: marker, page: 1, size: 10 } });
        if (response.status() !== 200) return -1;
        const list = ((await response.json()) as { data?: { list?: { srvcNm?: string }[] } }).data?.list ?? [];
        return list.filter(row => row.srvcNm === deniedPath(marker)).length;
    }, { message: '실패 요청 로그 도착', timeout: 30_000 }).toBeGreaterThanOrEqual(1);
}

/** 표의 데이터 행(머리글 행 제외). */
function dataRows(page: Page, table: string): Locator {
    return page.getByRole('table', { name: table }).getByRole('row').filter({ has: page.getByRole('cell') });
}

/** 그 분류의 로그 목록을 그 검색어(와 기간 yyyyMMdd)로 다시 읽은 응답. */
function logsLoaded(page: Page, kind: 'system' | 'login', keyword: string, period?: [string, string]) {
    return page.waitForResponse((response) => {
        const url = new URL(response.url());
        return url.pathname === `/api/v1/admin/system/logs/${kind}`
            && url.searchParams.get('searchKeyword') === keyword
            && (!period || (url.searchParams.get('searchKeywordFrom') === period[0] && url.searchParams.get('searchKeywordTo') === period[1]))
            && response.ok();
    });
}
