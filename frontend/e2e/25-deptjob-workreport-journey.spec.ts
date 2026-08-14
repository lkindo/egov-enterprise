import { test, expect } from './fixtures/base-test';
import { DeptJobPage } from './pages/DeptJobPage';
import fs from 'fs';
import path from 'path';

/**
 * [Tier 25] 부서 업무(DeptJob) ↔ 업무 보고(WorkReport) 사슬 회귀 방어
 *
 * 2026-07-19~20 의 세 커밋이 고친 결함에 E2E 가 하나도 없어(grep 'dept-job' → e2e 히트 0)
 * 같은 형태로 다시 깨져도 아무도 알아채지 못하는 상태였다. 그 결함들을 그대로 고정한다.
 *
 * ── f02c35295 (API 경로 복구)
 *   · 컨트롤러에 부서 업무 CRUD 매핑이 아예 없었다 — POST /api/v1/dept-jobs 는 존재하지 않는 경로였다.
 *   · PK(dept_task_id)를 클라이언트에서 받고 있었다. 등록 폼은 보내지 않으므로 null PK 로 저장 실패.
 *   · toDto 가 nullable 컬럼(dept_task_box_sn/dept_id/pic_id)에 required() 가드를 걸어,
 *     업무함 미지정 업무가 생기는 순간 목록·상세가 400 으로 깨지는 구조였다.
 *
 * ── 8b2b656a1 (상세·수정 화면 + 목록 대상 정정)
 *   · [id] 라우트가 params 를 받지 않는 '목록 화면의 복제본'이라 상세가 사실상 없었다.
 *   · 🚨 목록은 업무'함'(box)을 조회하는데 등록 버튼은 부서 업무(DeptJob)를 만들었다 —
 *     별개 엔티티라 등록한 업무가 목록에 영원히 나타나지 않았다.
 *   · 등록 후 파손된 목록으로 보냈다(지금은 서버 채번 id 로 상세에 착지해야 한다).
 *   · 검색 파라미터가 서버와 어긋나(searchWrd vs searchKeyword) 조용히 무력화됐다.
 *
 * ── 0452fd4f8 (업무 보고 결함 3종 + 페이저)
 *   · 보고 제목 검색이 이중으로 깨져 있었다: 이름 불일치로 서버 도달 실패 + searchKeyword 를
 *     작성자 필터(searchId)에도 넘겨 "작성자 == 검색어" 조건이 걸려 **항상 0건**.
 *   · pageUnit 이 무시되어 서버 기본 10건에 고정됐다.
 *   · StandardDataTable 이 지원하는 pagination prop 을 전달하지 않아 페이저가 아예 없었다.
 *   · 보고 행의 '관리' 컬럼이 onClick 없는 死버튼이었다(수정·삭제 진입점 부재).
 *
 * [검증 전략] 계약(채번·검색·페이징·소유권)은 API 로, 화면 배선(목록이 무엇을 보여주는가·
 *   등록 후 어디에 착지하는가·행에서 수정/삭제로 갈 수 있는가)은 UI 로 확인한다.
 *   API 로 확인할 수 있는 것을 UI 로 되풀이하지 않는다.
 */

/**
 * storageState(admin.json)에서 accessToken 을 꺼낸다.
 * 백엔드 JwtTokenProvider 는 Authorization: Bearer 헤더만 읽고 쿠키는 무시하므로
 * APIRequestContext 에는 토큰을 명시적으로 실어야 인증이 선다. (tier-19/24 와 동일 패턴)
 */
function getAdminBearerToken(): string {
    const authPath = path.resolve('playwright/.auth/admin.json');
    const state = JSON.parse(fs.readFileSync(authPath, 'utf-8'));
    const cookieToken = (state.cookies ?? []).find((c: any) => c.name === 'accessToken')?.value;
    const lsToken = (state.origins?.[0]?.localStorage ?? []).find((l: any) => l.name === 'accessToken')?.value;
    const token = cookieToken ?? lsToken;
    if (!token) {
        throw new Error('[tier-25] admin accessToken 을 playwright/.auth/admin.json 에서 찾을 수 없음 (setup 미실행?)');
    }
    return token;
}

const JOB_API = '/api/v1/dept-jobs';
const REPORT_API = '/api/v1/work-reports';

/** 이 스펙이 만든 자원만 지우기 위한 접두사. 다른 tier·cleanup 정책과 겹치지 않는 고유값을 쓴다. */
const PREFIX = 'E2E25_';

/** work-hub 목록의 페이지 크기(WorkHubClient 의 PAGE_UNIT). 페이저를 띄우려면 이보다 많아야 한다. */
const UI_PAGE_UNIT = 10;

test.describe('Tier 25: 부서 업무 ↔ 업무 보고 사슬', () => {
    // UI 검증은 저장된 관리자 세션을 재사용한다. 이 선언이 없으면 미인증 상태로 로그인 화면이 뜬다.
    test.use({ storageState: 'playwright/.auth/admin.json' });

    let auth: Record<string, string>;

    test.beforeAll(() => {
        auth = { Authorization: `Bearer ${getAdminBearerToken()}` };
    });

    // ─────────────────────────────────────────────────────────────────────────
    // 부서 업무 (DeptJob)
    // ─────────────────────────────────────────────────────────────────────────

    test('부서 업무: 서버 채번 등록 → 상세 → 검색 → 수정 → 삭제', async ({ request }) => {
        const name = `${PREFIX}Job_${Date.now()}`;

        // 1) 등록 — deptTaskSn(PK)를 보내지 않아도 DB identity가 채번해야 한다.
        //    업무함(deptTaskBoxSn)도 보내지 않는다. 이 조합이 f02c35295 의 3번 결함
        //    ("업무함 미지정 업무는 조회가 400 으로 깨진다")을 재현하는 조건이다.
        const createRes = await request.post(JOB_API, {
            headers: auth,
            data: { deptTaskNm: name, deptTaskCn: '회귀 방어용 업무', prrtyRnk: '2' },
        });
        expect(createRes.ok(), '부서 업무 등록은 PK 없이도 성공해야 한다 (컨트롤러 매핑 부재/PK 미채번 회귀)').toBeTruthy();

        const deptTaskSn = (await createRes.json()).data as number;
        expect(deptTaskSn, 'DB가 채번한 업무 일련번호가 반환되어야 한다').toBeGreaterThan(0);

        try {
            // 2) 상세 조회 — 업무함이 null 인 상태에서도 200 이어야 한다.
            //    종전에는 required() 가드 때문에 여기서 400 이 났다.
            const detailRes = await request.get(`${JOB_API}/${deptTaskSn}`, { headers: auth });
            expect(detailRes.ok(), '업무함 미지정(null) 업무도 상세 조회가 되어야 한다').toBeTruthy();

            const detail = (await detailRes.json()).data;
            expect(detail.deptTaskNm).toBe(name);
            // 담당자 미지정 시 서버가 등록자를 담당자로 채운다(등록 폼에 담당자 UI 가 없기 때문).
            expect(detail.picId, '담당자 미지정 시 등록자가 담당자로 채워져야 한다').toBeTruthy();

            // 3) 검색 — 서버가 실제로 걸러야 한다.
            //    searchCondition 미지정 시 컨트롤러가 업무명 검색("0")을 기본값으로 둔다.
            //    종전에는 조건이 붙지 않아 키워드를 받고도 전체를 돌려줬다.
            const hitRes = await request.get(`${JOB_API}?searchWrd=${encodeURIComponent(name)}&pageIndex=1&pageUnit=10`, { headers: auth });
            expect(hitRes.ok()).toBeTruthy();
            const hitList = (await hitRes.json()).data.list as any[];
            expect(hitList.some((j) => j.deptTaskSn === deptTaskSn), '등록한 업무가 제목 검색에 잡혀야 한다').toBeTruthy();

            const missRes = await request.get(`${JOB_API}?searchWrd=${PREFIX}NO_SUCH_JOB_ZZZ&pageIndex=1&pageUnit=10`, { headers: auth });
            const missList = (await missRes.json()).data.list as any[];
            expect(missList.length, '일치하지 않는 키워드는 0건이어야 한다 (검색 무력화 회귀)').toBe(0);

            // 4) 수정 — 업무함·담당자를 보내지 않으면 update 가 null 로 덮어쓴다는 점은
            //    폼이 값을 왕복시켜 방어한다. 여기서는 계약(수정이 반영되는가)만 본다.
            const editedName = `${name}_edited`;
            const updRes = await request.put(`${JOB_API}/${deptTaskSn}`, {
                headers: auth,
                data: { deptTaskNm: editedName, deptTaskCn: '수정됨', prrtyRnk: '1', picId: detail.picId },
            });
            expect(updRes.ok(), '부서 업무 수정이 성공해야 한다').toBeTruthy();

            const afterRes = await request.get(`${JOB_API}/${deptTaskSn}`, { headers: auth });
            const after = (await afterRes.json()).data;
            expect(after.deptTaskNm).toBe(editedName);
            expect(after.prrtyRnk).toBe('1');
            expect(after.picId, '수정 시 담당자를 왕복시키면 유지되어야 한다').toBe(detail.picId);
        } finally {
            // 5) 삭제 — 지운 뒤에는 404 여야 한다(종전 deleteById 는 없는 id 도 조용히 통과시켰다).
            const delRes = await request.delete(`${JOB_API}/${deptTaskSn}`, { headers: auth });
            expect(delRes.ok(), '부서 업무 삭제가 성공해야 한다').toBeTruthy();

            const goneRes = await request.get(`${JOB_API}/${deptTaskSn}`, { headers: auth });
            expect(goneRes.status(), '삭제한 업무의 상세는 404 여야 한다').toBe(404);
        }
    });

    test('부서 업무 목록은 업무함(box)이 아니라 부서 업무(DeptJob)를 보여준다', async ({ page, request }) => {
        // 🚨 8b2b656a1 의 핵심 결함. 목록이 getDeptJobBoxes 를 조회하던 시절에는
        //    아래에서 만든 업무가 목록에 **영원히** 나타나지 않았다.
        const name = `${PREFIX}Visible_${Date.now()}`;
        const res = await request.post(JOB_API, { headers: auth, data: { deptTaskNm: name, prrtyRnk: '2' } });
        const deptTaskSn = (await res.json()).data as number;

        const deptJobPage = new DeptJobPage(page);
        try {
            await deptJobPage.gotoJobList();
            await deptJobPage.search(name);

            // 등록한 '업무'가 목록에 보인다. 업무함은 이 이름을 가질 수 없으므로,
            // 이 단언 하나가 "목록이 어느 엔티티를 보는가"를 판별한다.
            const row = deptJobPage.row(name);
            await expect(row, '등록한 부서 업무가 목록에 나타나야 한다 (목록이 업무함을 보던 회귀)').toBeVisible({ timeout: 30000 });

            // 업무명 링크가 부서 업무 상세로 향한다 = 행이 들고 있는 식별자가 DeptJob 의 PK 다.
            // (업무함이라면 deptTaskBoxSn이라 이 href가 만들어질 수 없다.)
            await expect(
                row.locator(`a[href="/smart-toolkit/dept-job/${deptTaskSn}"]`),
                '행의 업무명은 해당 부서 업무 상세로 연결되어야 한다'
            ).toBeVisible();

            // 업무함 미지정 업무도 목록에서 깨지지 않고 '업무함 미지정' 으로 표기된다.
            await expect(row).toContainText('업무함 미지정');

            // 검색이 UI 경로에서도 실제로 걸러내는지 — 없는 키워드로는 빈 표가 되어야 한다.
            await deptJobPage.search(`${PREFIX}NO_SUCH_JOB_ZZZ`);
            await expect(deptJobPage.emptyMessage, '일치하지 않는 검색어는 빈 표가 되어야 한다').toBeVisible({ timeout: 20000 });
        } finally {
            await request.delete(`${JOB_API}/${deptTaskSn}`, { headers: auth });
        }
    });

    test('부서 업무 등록 후 서버 채번 id 의 상세 화면에 착지한다', async ({ page, request }) => {
        // 종전에는 파손된 목록(selectDeptJobList)으로 보냈고, 상세 라우트는 params 를 받지 않아
        // 어떤 업무를 보는지조차 알 수 없었다.
        const name = `${PREFIX}Landing_${Date.now()}`;
        const deptJobPage = new DeptJobPage(page);
        let deptTaskSn = 0;

        try {
            await deptJobPage.gotoJobCreate();
            await deptJobPage.jobNameInput.fill(name);
            await page.getByRole('button', { name: '업무 등록' }).click();

            // 서버가 채번한 식별자로 상세에 착지해야 한다.
            await expect(page, '등록 후 DB 채번 일련번호의 상세로 이동해야 한다').toHaveURL(/\/smart-toolkit\/dept-job\/\d+/, { timeout: 30000 });

            deptTaskSn = Number(new URL(page.url()).pathname.split('/').pop());
            expect(deptTaskSn).toBeGreaterThan(0);

            // 상세 화면이 '전달받은 id 의' 업무를 보여준다(목록 복제본이 아니다).
            await expect(page.getByText(name).first()).toBeVisible({ timeout: 30000 });
            await expect(page.getByText(String(deptTaskSn)).first(), '상세에 식별자가 표시되어야 한다').toBeVisible();
        } finally {
            if (deptTaskSn) await request.delete(`${JOB_API}/${deptTaskSn}`, { headers: auth });
        }
    });

    test('부서 업무 상세에서 수정·삭제할 수 있다', async ({ page, request }) => {
        const name = `${PREFIX}Detail_${Date.now()}`;
        const res = await request.post(JOB_API, {
            headers: auth,
            data: { deptTaskNm: name, deptTaskCn: '원본 내용', prrtyRnk: '2' },
        });
        const deptTaskSn = (await res.json()).data as number;
        let deleted = false;

        const deptJobPage = new DeptJobPage(page);
        try {
            await deptJobPage.gotoJobDetail(deptTaskSn);
            await expect(page.getByText(name).first()).toBeVisible({ timeout: 30000 });

            // 수정 — 폼에 기존 값이 실려 있어야 한다(빈 등록 폼이 뜨던 회귀).
            await page.getByRole('button', { name: '수정' }).click();
            await expect(deptJobPage.jobNameInput).toHaveValue(name, { timeout: 20000 });

            const editedName = `${name}_edited`;
            await deptJobPage.jobNameInput.fill(editedName);
            await page.getByRole('button', { name: '수정 저장' }).click();
            await expect(page.getByText(editedName).first(), '수정 결과가 상세에 반영되어야 한다').toBeVisible({ timeout: 30000 });

            // 삭제 — useConfirm 확인 후 목록으로 되돌아간다.
            await page.getByRole('button', { name: '삭제' }).click();
            await deptJobPage.confirmDialogButton('삭제').click();
            await expect(page, '삭제 후 목록으로 돌아가야 한다').toHaveURL(/\/smart-toolkit\/dept-job$/, { timeout: 30000 });

            const goneRes = await request.get(`${JOB_API}/${deptTaskSn}`, { headers: auth });
            expect(goneRes.status(), 'UI 삭제가 실제 삭제로 이어져야 한다').toBe(404);
            deleted = true;
        } finally {
            if (!deleted) await request.delete(`${JOB_API}/${deptTaskSn}`, { headers: auth });
        }
    });

    // ─────────────────────────────────────────────────────────────────────────
    // 업무 보고 (WorkReport)
    // ─────────────────────────────────────────────────────────────────────────

    test.describe('업무 보고', () => {
        /**
         * ⚠ 데이터 준비를 beforeAll 로 묶지 않는다.
         *   Playwright 의 `request` 는 test 스코프 fixture 라 beforeAll/afterAll 에서 쓸 수 없다
         *   ("test-scoped fixture" 오류). 각 테스트가 자기 데이터를 만들고 finally 로 지우는
         *   tier-24 의 방식을 그대로 따른다 — 테스트 간 순서 의존도 함께 사라진다.
         */

        /** 등록 API 는 식별자를 돌려주지 않는다(반환형 void). 태그로 검색해 되찾는다. */
        async function findByTag(request: any, tag: string): Promise<any[]> {
            const res = await request.get(`${REPORT_API}?searchKeyword=${encodeURIComponent(tag)}&pageIndex=1&pageUnit=100`, { headers: auth });
            expect(res.ok(), '업무 보고 목록 조회가 성공해야 한다').toBeTruthy();
            return ((await res.json()).data.list as any[]) ?? [];
        }

        /** 태그를 공유하는 보고 n 건을 만든다. 제목은 `<tag>_01` 형태다. */
        async function seedReports(request: any, tag: string, count: number) {
            for (let i = 1; i <= count; i++) {
                const seq = String(i).padStart(2, '0');
                const res = await request.post(REPORT_API, {
                    headers: auth,
                    data: { rptTtl: `${tag}_${seq}`, rptCn: `회귀 방어용 보고 ${seq}`, rptYmd: '20260720', rptSeCd: '1' },
                });
                expect(res.ok(), `업무 보고 등록이 성공해야 한다 (#${seq})`).toBeTruthy();
            }
        }

        /** 태그로 잡히는 보고를 전부 지운다. */
        async function purgeByTag(request: any, tag: string) {
            for (const r of await findByTag(request, tag)) {
                if (r.rptpSn) await request.delete(`${REPORT_API}/${r.rptpSn}`, { headers: auth });
            }
        }

        /** 실행마다 고유한 태그 — 앞선 실행이 남긴 데이터와 건수가 섞이지 않게 한다. */
        const tagFor = (label: string) => `${PREFIX}RPT${label}${Date.now().toString().slice(-8)}`;

        test('제목 검색이 실제로 걸러진다 (종전엔 항상 0건)', async ({ request }) => {
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
            } finally {
                await purgeByTag(request, tag);
            }
        });

        test('pageUnit 이 존중된다 (종전엔 서버 기본 10건 고정)', async ({ request }) => {
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
                const p2 = (await p2Res.json()).data.list as any[];
                const p1Ids = (body.list as any[]).map((r) => r.rptpSn);
                expect(p2.length, '2페이지에는 나머지 1건이 있어야 한다').toBe(1);
                expect(p2.some((r) => p1Ids.includes(r.rptpSn)), '2페이지는 1페이지와 겹치지 않아야 한다').toBeFalsy();
            } finally {
                await purgeByTag(request, tag);
            }
        });

        test('목록에 페이저가 있고 다음 페이지로 이동한다', async ({ page, request }) => {
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
            } finally {
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
            } finally {
                if (!deleted) await request.delete(`${REPORT_API}/${rptpSn}`, { headers: auth });
            }
        });
    });
});
