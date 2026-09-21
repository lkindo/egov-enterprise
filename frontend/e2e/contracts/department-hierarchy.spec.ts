import { expect,test } from '../fixtures/api-test';
import { getAdminBearerToken } from '../utils/admin-token';
const DEPT_API = '/api/v1/admin/system/departments';
/** 이 스펙이 만든 자원만 지우기 위한 접두사. cleanup 정책과 충돌하지 않게 고유값을 쓴다. */
const PREFIX = 'E2E24_';
test.describe('조직 ↔ 일정 통합 사슬', () => {
    // UI 검증은 저장된 관리자 세션을 재사용한다. 이 선언이 없으면 미인증 상태로 로그인 화면이 뜬다.
    // (API 검증은 아래 Bearer 헤더를 직접 싣는다 — 백엔드는 쿠키를 읽지 않는다.)
    test.use({ storageState: 'playwright/.auth/admin.json' });
    let auth: Record<string, string>;
    test.beforeAll(() => {
        auth = { Authorization: `Bearer ${getAdminBearerToken()}` };
    });
    test('부서 생성 → 계층 저장 → 순환참조 차단 → 삭제 가드', async ({ request }) => {
        // 1) 부서 생성 — ognzId 를 보내지 않아도 서버가 채번해야 한다(과거엔 400).
        const parentRes = await request.post(DEPT_API, {
            headers: auth,
            data: { ognzNm: `${PREFIX}Parent` },
        });
        expect(parentRes.ok(), '부서 등록은 ognzId 없이도 성공해야 한다').toBeTruthy();
        const parentId = (await parentRes.json()).data as string;
        expect(parentId, '서버가 채번한 부서 ID 가 반환되어야 한다').toMatch(/^ORGNZT_/);
        const childRes = await request.post(DEPT_API, {
            headers: auth,
            data: { ognzNm: `${PREFIX}Child` },
        });
        expect(childRes.ok()).toBeTruthy();
        const childId = (await childRes.json()).data as string;
        // 2) 계층 저장 — child 를 parent 아래로.
        const hierRes = await request.put(`${DEPT_API}/batch-hierarchy`, {
            headers: auth,
            data: [
                { ognzId: parentId, sortOrdr: 1 },
                { ognzId: childId, upOgnzId: parentId, sortOrdr: 2 },
            ],
        });
        expect(hierRes.ok(), '계층 일괄 저장이 성공해야 한다').toBeTruthy();
        // 저장 결과가 실제로 조회에 반영되는지 확인(응답 200 만으로는 부족 — 과거에 sort 만 저장된 적이 있다).
        const detailRes = await request.get(`${DEPT_API}/${childId}`, { headers: auth });
        expect(detailRes.ok()).toBeTruthy();
        const child = (await detailRes.json()).data;
        expect(child.upOgnzId, '하위 부서의 상위 ID 가 저장되어야 한다').toBe(parentId);
        // 3) 순환 참조 차단 — parent 를 자기 자식의 자식으로 만들려는 시도.
        const cycleRes = await request.put(`${DEPT_API}/batch-hierarchy`, {
            headers: auth,
            data: [{ ognzId: parentId, upOgnzId: childId }],
        });
        expect(cycleRes.status(), '순환 참조는 400 으로 거부되어야 한다').toBe(400);
        // 4) 삭제 가드 — 하위 부서가 있으면 409.
        const guardRes = await request.delete(`${DEPT_API}/${parentId}`, { headers: auth });
        expect(guardRes.status(), '하위 부서가 있으면 409 로 막아야 한다').toBe(409);
        // 5) 정리 — 자식부터 지우면 부모도 지워진다.
        expect((await request.delete(`${DEPT_API}/${childId}`, { headers: auth })).ok()).toBeTruthy();
        expect((await request.delete(`${DEPT_API}/${parentId}`, { headers: auth })).ok()).toBeTruthy();
    });
});
