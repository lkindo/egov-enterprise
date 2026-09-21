import { expect,test } from '../fixtures/api-test';
import { getAdminBearerToken } from '../utils/admin-token';
const JOB_API = '/api/v1/dept-jobs';
/** 이 스펙이 만든 자원만 지우기 위한 접두사. 다른 tier·cleanup 정책과 겹치지 않는 고유값을 쓴다. */
const PREFIX = 'E2E25_';
test.describe('부서 업무 ↔ 업무 보고 사슬', () => {
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
        }
        finally {
            // 5) 삭제 — 지운 뒤에는 404 여야 한다(종전 deleteById 는 없는 id 도 조용히 통과시켰다).
            const delRes = await request.delete(`${JOB_API}/${deptTaskSn}`, { headers: auth });
            expect(delRes.ok(), '부서 업무 삭제가 성공해야 한다').toBeTruthy();
            const goneRes = await request.get(`${JOB_API}/${deptTaskSn}`, { headers: auth });
            expect(goneRes.status(), '삭제한 업무의 상세는 404 여야 한다').toBe(404);
        }
    });
});
