import { expect,test } from '../fixtures/browser-test';
import { workReportData } from '../helpers/work-report-data';
import { DeptJobPage } from '../pages/DeptJobPage';
import { getAdminBearerToken } from '../utils/admin-token';
const REPORT_API = '/api/v1/work-reports';
/** 이 스펙이 만든 자원만 지우기 위한 접두사. 다른 tier·cleanup 정책과 겹치지 않는 고유값을 쓴다. */
const PREFIX = 'E2E25_';
/** work-hub 목록의 페이지 크기(WorkHubClient 의 PAGE_UNIT). 페이저를 띄우려면 이보다 많아야 한다. */
const UI_PAGE_UNIT = 10;
test.describe('부서 업무 ↔ 업무 보고 사슬', () => {
    // UI 검증은 저장된 관리자 세션을 재사용한다. 이 선언이 없으면 미인증 상태로 로그인 화면이 뜬다.
    test.use({ storageState: 'playwright/.auth/admin.json' });
    let auth: Record<string, string>;
    test.beforeAll(() => {
        auth = { Authorization: `Bearer ${getAdminBearerToken()}` };
    });
    // ─────────────────────────────────────────────────────────────────────────
    // 업무 보고 (WorkReport)
    // ─────────────────────────────────────────────────────────────────────────
    test.describe('업무 보고', () => {
        test('목록에 페이저가 있고 다음 페이지로 이동한다', async ({ page, request }) => {
            const { seedReports, purgeByTag, tagFor } = workReportData(auth);
            // 종전에는 work-hub 가 pagination prop 을 전달하지 않아 첫 페이지 밖의 데이터에
            // 도달할 방법이 아예 없었다. 페이저가 '렌더되는' 조건(totalPages > 1)을 실제로
            // 성립시키려면 목록 페이지 크기보다 많아야 하므로 11건을 만든다.
            // (if-visible 같은 조건부 검증은 기능이 사라져도 조용히 통과하므로 쓰지 않는다.)
            const REPORT_COUNT = UI_PAGE_UNIT + 1;
            const tag = tagFor('Pager');
            await seedReports(request, tag, REPORT_COUNT);
            const deptJobPage = new DeptJobPage(page);
            try {
                await deptJobPage.gotoReportList();
                await deptJobPage.search(tag);
                // 11건이므로 1페이지 10행 / 2페이지 1행이다.
                // ⚠ "몇 번 보고가 1페이지에 있는가"로 단언하지 않는다 — 서버 정렬 순서에 의존해
                //    정렬만 바뀌어도 깨지는 취약한 단언이 된다. 행 '수'는 순서와 무관하다.
                await expect(deptJobPage.rows, '1페이지에는 페이지 크기만큼 행이 있어야 한다')
                    .toHaveCount(UI_PAGE_UNIT, { timeout: 30000 });
                await expect(deptJobPage.nextPageButton, '페이저가 렌더되어야 한다 (pagination prop 미전달 회귀)').toBeVisible({ timeout: 20000 });
                await deptJobPage.nextPageButton.click();
                await expect(deptJobPage.rows, '2페이지에는 나머지 1행이 있어야 한다')
                    .toHaveCount(REPORT_COUNT - UI_PAGE_UNIT, { timeout: 20000 });
                await expect(deptJobPage.prevPageButton, '2페이지에서는 이전 버튼이 활성이어야 한다').toBeEnabled();
            }
            finally {
                await purgeByTag(request, tag);
            }
        });
        test('행의 수정·삭제가 살아 있다 (종전엔 死버튼)', async ({ page, request }) => {
            // 검색으로 이 한 건만 남기므로 다른 테스트의 건수와 섞이지 않는다.
            const title = `${PREFIX}RowOps_${Date.now()}`;
            const createRes = await request.post(REPORT_API, {
                headers: auth,
                data: { rptTtl: title, rptCn: '행 조작 검증', rptYmd: '20260720', rptSeCd: '1' },
            });
            expect(createRes.ok()).toBeTruthy();
            const listRes = await request.get(`${REPORT_API}?searchKeyword=${encodeURIComponent(title)}&pageIndex=1&pageUnit=10`, { headers: auth });
            const rptpSn = ((await listRes.json()).data.list as any[])[0]?.rptpSn as number;
            expect(rptpSn, '등록한 보고를 검색으로 되찾을 수 있어야 한다').toBeTruthy();
            let deleted = false;
            const deptJobPage = new DeptJobPage(page);
            try {
                await deptJobPage.gotoReportList();
                await deptJobPage.search(title);
                await expect(deptJobPage.row(title)).toBeVisible({ timeout: 30000 });
                // 수정 — 모달이 기존 값을 싣고 열려야 한다.
                await deptJobPage.rowEditButton(title).click();
                await expect(deptJobPage.reportTitleInput, '수정 폼에 기존 제목이 실려야 한다').toHaveValue(title, { timeout: 20000 });
                const editedTitle = `${title}_edited`;
                await deptJobPage.reportTitleInput.fill(editedTitle);
                await page.getByRole('button', { name: '수정 저장' }).click();
                // 저장은 비동기(모달 닫힘 → invalidate)라 서버 상태를 폴링으로 확인한다.
                await expect
                    .poll(async () => {
                    const r = await request.get(`${REPORT_API}/${rptpSn}`, { headers: auth });
                    return (await r.json()).data?.rptTtl;
                }, { timeout: 20000, message: 'UI 수정이 서버에 반영되어야 한다' })
                    .toBe(editedTitle);
                // 삭제 — useConfirm 확인 후 서버에서도 사라져야 한다.
                await deptJobPage.search(editedTitle);
                await expect(deptJobPage.row(editedTitle)).toBeVisible({ timeout: 20000 });
                await deptJobPage.rowDeleteButton(editedTitle).click();
                await deptJobPage.confirmDialogButton('삭제').click();
                // ⚠ WorkReportService.getWorkReport 는 없는 id 에 대해 예외가 아니라 null 을 돌려준다
                //   (`.orElse(null)`). 즉 상세 조회는 404 가 아니라 **200 + data:null** 이다.
                //   부서 업무(orElseThrow → 404)와 계약이 다르므로 그대로 반영해 단언한다.
                //   (`?? null` 은 Jackson 이 null 필드를 생략하도록 설정된 경우 undefined 로 오는 것까지 흡수한다.)
                await expect
                    .poll(async () => {
                    const r = await request.get(`${REPORT_API}/${rptpSn}`, { headers: auth });
                    return (await r.json()).data ?? null;
                }, { timeout: 20000, message: 'UI 삭제가 실제 삭제로 이어져야 한다' })
                    .toBeNull();
                deleted = true;
            }
            finally {
                if (!deleted)
                    await request.delete(`${REPORT_API}/${rptpSn}`, { headers: auth });
            }
        });
    });
});
