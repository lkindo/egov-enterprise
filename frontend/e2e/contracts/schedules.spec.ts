import { expect,test } from '../fixtures/api-test';
import { getAdminBearerToken } from '../utils/admin-token';
const SCHEDULE_API = '/api/v1/schedules';
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
    test('일정 등록 → 월별 조회 노출 → 수정 → 삭제', async ({ request }) => {
        const ymd = '20260715';
        const yearMonth = ymd.slice(0, 6);
        // 1) 등록 — schdlSn(PK)·schdlPicId(담당자)는 보내지 않는다. DB·서버가 채번·고정해야 한다.
        const createRes = await request.post(SCHEDULE_API, {
            headers: auth,
            data: {
                schdlNm: `${PREFIX}Schedule`,
                schdlBgngYmd: ymd,
                schdlEndYmd: ymd,
                schdlSeCd: '2',
            },
        });
        expect(createRes.ok(), '일정 등록이 성공해야 한다').toBeTruthy();
        const schdlSn = (await createRes.json()).data as number;
        expect(schdlSn, 'DB가 채번한 일정 일련번호가 반환되어야 한다').toBeGreaterThan(0);
        // 2) 월별 조회에 노출 — 저장축(schdlPicId)과 조회축이 어긋나면 여기서 사라진다.
        //    ⚠ yearMonth 는 하이픈 없는 6자여야 한다. 'yyyy-MM' 을 보내면 예외 없이 0건이 된다.
        const monthRes = await request.get(`${SCHEDULE_API}/monthly?yearMonth=${yearMonth}`, { headers: auth });
        expect(monthRes.ok()).toBeTruthy();
        interface ScheduleItem {
            schdlSn: number;
            schdlPicId?: string;
            schdlNm?: string;
        }
        const list = (await monthRes.json()).data as ScheduleItem[];
        const mine = list.find((s) => s.schdlSn === schdlSn);
        expect(mine, '등록한 일정이 월별 조회에 나와야 한다').toBeTruthy();
        expect(mine?.schdlPicId, '담당자는 서버가 인증 주체로 채워야 한다').toBeTruthy();
        // 3) 수정 — 담당자는 재지정되지 않아야 한다(매스어사인먼트 차단).
        const updRes = await request.put(`${SCHEDULE_API}/${schdlSn}`, {
            headers: auth,
            data: {
                schdlNm: `${PREFIX}Schedule_edited`,
                schdlBgngYmd: ymd,
                schdlEndYmd: ymd,
                schdlSeCd: '2',
                schdlPicId: 'attacker',
            },
        });
        expect(updRes.ok(), '일정 수정이 성공해야 한다').toBeTruthy();
        const afterRes = await request.get(`${SCHEDULE_API}/${schdlSn}`, { headers: auth });
        expect(afterRes.ok()).toBeTruthy();
        const after = (await afterRes.json()).data;
        expect(after.schdlNm).toBe(`${PREFIX}Schedule_edited`);
        expect(after.schdlPicId, '담당자는 요청 값으로 바뀌지 않아야 한다').not.toBe('attacker');
        // 4) 삭제
        expect((await request.delete(`${SCHEDULE_API}/${schdlSn}`, { headers: auth })).ok()).toBeTruthy();
        const goneRes = await request.get(`${SCHEDULE_API}/monthly?yearMonth=${yearMonth}`, { headers: auth });
        const goneList = (await goneRes.json()).data as ScheduleItem[];
        expect(goneList.find((s) => s.schdlSn === schdlSn), '삭제한 일정은 조회되지 않아야 한다').toBeFalsy();
    });
});
