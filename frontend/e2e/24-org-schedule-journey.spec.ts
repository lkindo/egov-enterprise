import { test, expect } from './fixtures/base-test';
import fs from 'fs';
import path from 'path';

/**
 * [Tier 24] 조직 ↔ 일정 통합 사슬 회귀 방어
 *
 * 다음 사슬이 끝에서 끝까지 살아 있는지 고정한다.
 *   부서 생성 → 계층 구성 → 일정 등록(개인/부서) → 부서 축 조회 → 수정/삭제 → 부서 삭제 가드
 *
 * 각 단계는 과거 실제로 파손돼 있던 지점이다:
 *  - 부서 등록: ognzId 가 @NotBlank 인데 서버 채번도 폼 입력도 없어 항상 400 이었다.
 *  - 조직 계층: up_ognz_id/sort_ordr 물리 컬럼과 PUT /batch-hierarchy 가 아예 없었고(팬텀 UI),
 *    이후에도 onDragEnd 가 dragOffset=0 을 고정해 깊이가 계산되지 않았다.
 *  - 일정 등록: PK 미채번 + schdlPicId 미충전로 저장되지 않거나 어떤 목록에도 보이지 않았다.
 *  - 부서 삭제: 소속 사용자/하위 부서가 있어도 무조건 물리 삭제해 고아 참조를 만들었다.
 *
 * [검증 전략] D&D 조작 자체는 자동화하지 않는다. dnd-kit 의 PointerSensor
 *   activationConstraint(distance 8) 때문에 드래그 깊이 변화가 안정적으로 재현되지 않아
 *   테스트가 플레이키해진다. 지켜야 할 계약은 '드래그 동작'이 아니라
 *   '계층이 저장되고 화면에 반영되는가' 이므로 저장은 API 로, 반영은 UI 로 확인한다.
 */

/**
 * storageState(admin.json)에서 accessToken 을 꺼낸다.
 * 백엔드 JwtTokenProvider 는 Authorization: Bearer 헤더만 읽고 쿠키는 무시하므로
 * APIRequestContext 에는 토큰을 명시적으로 실어야 인증이 선다. (tier-19 와 동일 패턴)
 */
function getAdminBearerToken(): string {
    const authPath = path.resolve('playwright/.auth/admin.json');
    const state = JSON.parse(fs.readFileSync(authPath, 'utf-8'));
    const cookieToken = (state.cookies ?? []).find((c: any) => c.name === 'accessToken')?.value;
    const lsToken = (state.origins?.[0]?.localStorage ?? []).find((l: any) => l.name === 'accessToken')?.value;
    const token = cookieToken ?? lsToken;
    if (!token) {
        throw new Error('[tier-24] admin accessToken 을 playwright/.auth/admin.json 에서 찾을 수 없음 (setup 미실행?)');
    }
    return token;
}

const DEPT_API = '/api/v1/admin/system/departments';
const SCHEDULE_API = '/api/v1/schedules';

/** 이 스펙이 만든 자원만 지우기 위한 접두사. cleanup 정책과 충돌하지 않게 고유값을 쓴다. */
const PREFIX = 'E2E24_';

test.describe('Tier 24: 조직 ↔ 일정 통합 사슬', () => {
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
        const list = (await monthRes.json()).data as any[];
        const mine = list.find((s) => s.schdlSn === schdlSn);
        expect(mine, '등록한 일정이 월별 조회에 나와야 한다').toBeTruthy();
        expect(mine.schdlPicId, '담당자는 서버가 인증 주체로 채워야 한다').toBeTruthy();

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
        const goneList = (await goneRes.json()).data as any[];
        expect(goneList.find((s) => s.schdlSn === schdlSn), '삭제한 일정은 조회되지 않아야 한다').toBeFalsy();
    });

    test('캘린더 탭 — 일정 등록·수정·삭제 UI 가 노출된다', async ({ page, request }) => {
        // UI 검증용 일정 1건을 API 로 만들어 둔다(등록 폼 자체는 아래에서 별도로 연다).
        //
        // [2026-08-03 시한폭탄 제거] 종전엔 '20260716' 하드코딩이었다. 그런데 캘린더 탭은
        //   WorkHubClient 가 `format(currentDate, 'yyyyMM')` 로 **현재 달**만 조회한다(monthly API).
        //   그래서 이 픽스처는 2026-07 에만 목록에 나타났고, 8월이 되자 목록이 비어
        //   schedule-edit 버튼이 존재하지 않아 실패했다 — 제품 결함도 플레이키도 아닌
        //   테스트가 특정 달에만 성립하도록 쓰여 있던 문제다.
        //   (위 API 전용 테스트들의 하드코딩 날짜는 조회도 같은 yearMonth 로 하므로 자기정합적이다.)
        //
        //   현재 달의 15일로 만든다 — 1일/말일을 피하면 하루 경계의 어긋남도 함께 없앤다.
        //   selectedDate 는 초기값이 undefined 라 그 달의 일정이면 어느 날짜든 목록에 나온다
        //   (visibleSchedules 참조).
        //
        // [2026-09-01 시한폭탄 제거 — 같은 함정의 '달' 축] 위 수정은 **일** 경계만 피했고
        //   **월** 경계는 그대로 남아 있었다. 화면의 기준 달은 SSR 이 내려주는
        //   `getTodayYmd()` 가 정하는데 그 함수는 `Asia/Seoul` 고정이다(하이드레이션 불일치
        //   방지 목적). 반면 이 픽스처는 러너 TZ(CI 는 UTC)로 달을 골랐다. 그래서
        //   KST 자정~09:00(UTC 15:00~24:00) 구간에는 화면이 다음 달을 조회하고 픽스처는
        //   이전 달에 남아 목록이 비었다 — schedule-edit 이 존재하지 않아 실패한다.
        //   실측: CI UTC 2026-08-31T23:07 = KST 2026-09-01 08:07 → 화면 202609 / 픽스처 202608.
        //   main 의 마지막 e2e(8/30)는 KST 로도 8월이라 통과했으므로 회귀가 아니라 날짜 폭탄이다.
        //   화면과 같은 기준(Asia/Seoul)으로 달을 고른다 — 앱이 TZ 를 바꾸면 여기도 함께 바뀐다.
        const seoulToday = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
        }).format(new Date()).replaceAll('-', '');
        const ymd = `${seoulToday.slice(0, 6)}15`;
        const res = await request.post(SCHEDULE_API, {
            headers: auth,
            data: { schdlNm: `${PREFIX}UiFixture`, schdlBgngYmd: ymd, schdlEndYmd: ymd, schdlSeCd: '2' },
        });
        const schdlSn = (await res.json()).data as number;

        try {
            // e2e=true 는 SmartOnboardingHub 가 투어를 띄우지 않게 하는 프로젝트 표준 플래그다.
            // 이 투어는 z-[10000] 전면 오버레이라 붙이지 않으면 캘린더를 덮어 검증이 불가능하다.
            await page.goto('/admin/work-hub?tab=calendar&e2e=true');

            // 캘린더 섹션이 렌더되어야 한다. (그리드 셀 자체는 react-day-picker 내부 구조라
            //  단언 대상으로 삼지 않는다 — 라이브러리 업그레이드에 취약하다.)
            // [2026-08-25 A1 이행] '일정 캘린더'는 이제 탭 라벨이기도 하다 —
            // 단순 텍스트 가시성이 아니라 그 탭이 실제로 선택됐는지를 본다.
            await expect(page.getByRole('tab', { name: '일정 캘린더' }))
                .toHaveAttribute('aria-selected', 'true', { timeout: 30000 });

            // 등록 버튼 — 과거에는 onClick 이 없는 死버튼이라 등록 경로 자체가 없었다.
            const createBtn = page.getByRole('button', { name: '일정 등록' }).first();
            await expect(createBtn, '캘린더 탭에는 일정 등록 버튼이 있어야 한다').toBeVisible({ timeout: 20000 });

            // 등록 다이얼로그가 열리고 날짜 입력이 존재해야 한다.
            await createBtn.click();
            await expect(page.locator('input[name="schdlNm"]')).toBeVisible({ timeout: 15000 });
            await expect(page.locator('input[type="date"]').first()).toBeVisible();
            await page.getByRole('button', { name: '취소' }).click();

            // 목록 행에 수정/삭제가 있어야 한다 — 과거에는 등록만 되고 고칠 수단이 없었다.
            await expect(page.locator('[data-testid="schedule-edit"]').first()).toBeVisible({ timeout: 20000 });
            await expect(page.locator('[data-testid="schedule-delete"]').first()).toBeVisible();
        } finally {
            await request.delete(`${SCHEDULE_API}/${schdlSn}`, { headers: auth });
        }
    });
});
