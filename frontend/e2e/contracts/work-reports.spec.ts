import { expect,test } from '../fixtures/api-test';
import { workReportData } from '../helpers/work-report-data';
import { getAdminBearerToken } from '../utils/admin-token';
const REPORT_API = '/api/v1/work-reports';
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
        test('제목 검색이 실제로 걸러진다 (종전엔 항상 0건)', async ({ request }) => {
            const { findByTag, seedReports, purgeByTag, tagFor } = workReportData(auth);
            const tag = tagFor('Search');
            await seedReports(request, tag, 3);
            try {
                // 🚨 종전에는 searchKeyword 를 작성자 필터(searchId → userId.eq)에도 넘겨
                //    "작성자 == 검색어" 조건이 함께 걸렸다. 그래서 제목이 아무리 맞아도 결과가 0건이었다.
                //    아래 첫 단언이 그 회귀를 정면으로 잡는다.
                const hit = await findByTag(request, tag);
                expect(hit.length, '제목이 일치하는 보고가 검색되어야 한다').toBe(3);
                expect(hit.every((r) => (r.rptTtl ?? '').includes(tag)), '검색 결과는 모두 키워드를 포함해야 한다').toBeTruthy();
                // 더 좁은 키워드는 더 적게 — '조건을 안 붙이고 전체를 돌려주는' 반대 방향의 무력화도 막는다.
                const narrow = await findByTag(request, `${tag}_01`);
                expect(narrow.length, '더 좁은 키워드는 1건만 잡혀야 한다').toBe(1);
                const miss = await findByTag(request, `${tag}_NO_SUCH_ZZZ`);
                expect(miss.length, '일치하지 않는 키워드는 0건이어야 한다').toBe(0);
            }
            finally {
                await purgeByTag(request, tag);
            }
        });
        test('pageUnit 이 존중된다 (종전엔 서버 기본 10건 고정)', async ({ request }) => {
            const { seedReports, purgeByTag, tagFor } = workReportData(auth);
            const tag = tagFor('Page');
            await seedReports(request, tag, 3);
            try {
                const res = await request.get(`${REPORT_API}?searchKeyword=${tag}&pageIndex=1&pageUnit=2`, { headers: auth });
                expect(res.ok()).toBeTruthy();
                const body = (await res.json()).data;
                expect(body.list.length, 'pageUnit=2 면 2건만 와야 한다 (페이지 크기 무시 회귀)').toBe(2);
                expect(body.total, '전체 건수는 페이지 크기와 무관해야 한다').toBe(3);
                expect(body.totalPage, '3건을 2건씩 나누면 2페이지가 되어야 한다').toBe(2);
                // 2페이지는 1페이지와 겹치지 않아야 한다(페이지 이동이 실제로 작동하는가).
                const p2Res = await request.get(`${REPORT_API}?searchKeyword=${tag}&pageIndex=2&pageUnit=2`, { headers: auth });
                const p2 = (await p2Res.json()).data.list as Array<{ rptpSn: number }>;
                const p1Ids = (body.list as Array<{ rptpSn: number }>).map((r) => r.rptpSn);
                expect(p2.length, '2페이지에는 나머지 1건이 있어야 한다').toBe(1);
                expect(p2.some((r) => p1Ids.includes(r.rptpSn)), '2페이지는 1페이지와 겹치지 않아야 한다').toBeFalsy();
            }
            finally {
                await purgeByTag(request, tag);
            }
        });
    });
});
