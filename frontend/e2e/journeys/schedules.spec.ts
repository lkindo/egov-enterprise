import { expect,test } from '../fixtures/browser-test';
import { waitForHydration } from '../fixtures/hydration';
import { getAdminBearerToken } from '../utils/admin-token';
import { screenYmd } from '../helpers/screen-date';
/**
 * 화면 동작이 부른 응답을 기다리는 상한. 요청이 나가지 않으면 시험 제한 시간까지 매달리지 않고 실패해,
 * finally 의 정리가 살아 있는 컨텍스트에서 돈다(2026-11-10 격리 E2E 에서 180초 매달린 뒤 정리가 끊겼다).
 */
const RESPONSE_WAIT = { timeout: 20_000 };
test.describe('부서 일정 진입', () => {
    /**
     * Enterprise Workflow & Productivity
     * 전자결재 및 스마트 툴킷(일정, 업무보고) 등 핵심 기업 워크플로우 검증
     */
    test.describe('Enterprise Workflow & Productivity', () => {
        test.use({
            storageState: 'playwright/.auth/admin.json',
            viewport: { width: 1920, height: 1080 }
        });
        test("부서 일정 화면의 제목과 표를 표시한다", async ({ page }) => {
            console.log('\n>>> Starting Productivity: Smart Toolkit - Schedule');
            await page.goto('/smart-toolkit/schedule/dept');
            // 일정 관리 대시보드 확인
            await expect(page.locator('h1, h2').filter({ hasText: /일정|Schedule/i }).first()).toBeVisible();
            console.log('>>> Verifying Schedule Table visibility');
            const table = page.locator('table');
            await expect(table.first()).toBeVisible();
        });
    });
});
test.describe('캘린더 조작', () => {
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
        test('캘린더 탭 — 일정 등록·수정·삭제 UI 가 노출된다', async ({ page, request }) => {
            // UI 검증용 일정 1건을 API 로 만들어 둔다(등록 폼 자체는 아래에서 별도로 연다).
            //
            // [2026-08-03 시한폭탄 제거] 종전엔 '20260716' 하드코딩이었다. 그런데 캘린더 탭은
            //   일정 화면(ScheduleCalendarClient)이 `format(currentDate, 'yyyyMM')` 로 **현재 달**만 조회한다(monthly API).
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
            //   화면과 같은 기준(앱의 getTodayYmd)으로 달을 고른다 — 앱이 TZ 를 바꾸면 여기도 함께 바뀐다.
            const ymd = `${screenYmd().slice(0, 6)}15`;
            const res = await request.post(SCHEDULE_API, {
                headers: auth,
                data: { schdlNm: `${PREFIX}UiFixture`, schdlBgngYmd: ymd, schdlEndYmd: ymd, schdlSeCd: '2' },
            });
            const schdlSn = (await res.json()).data as number;
            try {
                // SmartOnboardingHub 안내는 E2E 인증 상태의 본 표시로 숨는다(fixtures/auth-state.mjs) — 주소 우회는 2026-11-08 걷었다.
                // [업무 허브 분해 W1] 나의 업무의 옛 탭 주소(?tab=calendar) 호환을 걷었다 — 일정은 자기 경로의 화면이다.
                await page.goto('/smart-toolkit/schedule');
                await expect(page.getByRole('heading', { level: 1, name: '일정', exact: true })).toBeVisible({ timeout: 15000 });
                // 캘린더 섹션이 렌더되어야 한다. (그리드 셀 자체는 react-day-picker 내부 구조라
                //  단언 대상으로 삼지 않는다 — 라이브러리 업그레이드에 취약하다.)
                // 단순 텍스트 가시성이 아니라 일정 탭이 실제로 선택됐는지를 본다.
                await expect(page.getByRole('tab', { name: '일정', exact: true }))
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
            }
            finally {
                await request.delete(`${SCHEDULE_API}/${schdlSn}`, { headers: auth });
            }
        });
        test('캘린더: 날짜를 고르면 그날 일정만 남고 화면에서 등록·수정·삭제한다', async ({ page, request }) => {
            // 화면의 기준 달(SSR 의 getTodayYmd, 한국 날짜)과 같은 달의 15·16일에 개인 일정 두 건을 준비한다.
            const unique = `${Date.now()}`;
            const yearMonth = screenYmd().slice(0, 6);
            const year = Number(yearMonth.slice(0, 4));
            const month = Number(yearMonth.slice(4, 6));
            const onDay15 = `${PREFIX}Day15_${unique}`;
            const onDay16 = `${PREFIX}Day16_${unique}`;
            const created = `${PREFIX}UiNew_${unique}`;
            const edited = `${PREFIX}UiEdited_${unique}`;
            const fixtures: number[] = [];
            let createdSn = 0;
            let createdDeleted = false;
            const row = (name: string) => page.getByRole('row').filter({ hasText: name });
            try {
                for (const [name, day] of [[onDay15, '15'], [onDay16, '16']] as const) {
                    const res = await request.post(SCHEDULE_API, {
                        headers: auth,
                        data: { schdlNm: name, schdlBgngYmd: `${yearMonth}${day}`, schdlEndYmd: `${yearMonth}${day}`, schdlSeCd: '2' },
                    });
                    expect(res.status(), '캘린더 시험용 일정 생성이 성공해야 한다').toBe(201);
                    fixtures.push((await res.json()).data as number);
                }
                await page.goto('/smart-toolkit/schedule');
                await expect(page.getByRole('heading', { level: 1, name: '일정', exact: true })).toBeVisible({ timeout: 15000 });
                // 월 조회(서버)가 준비한 두 일정을 표에 싣는다.
                await expect(row(onDay15), '그 달의 일정이 표에 보여야 한다').toBeVisible({ timeout: 20000 });
                await expect(row(onDay16)).toBeVisible();
                // 날짜 단추의 접근 이름은 공용 달력이 내용으로 만든다 — 보이는 숫자 + 숨김 "일 요일, 연 월"(2026-11-14, WCAG 2.5.3).
                //   Chromium 은 숨김 글자 앞에 공백을 넣어 "15 일 일요일, 2026년 11월" 로 읽는다. 연·월까지 맞춰 바깥 달의 15일과 가른다.
                await page.getByRole('button', { name: new RegExp(`^15 ?일 [월화수목금토일]요일, ${year}년 ${month}월`) }).click();
                await expect(page.getByRole('heading', { level: 2, name: new RegExp(`^${year}년 ${month}월 15일 \\(.\\) 일정$`) })).toBeVisible();
                await expect(row(onDay15), '고른 날짜의 일정은 남아야 한다').toBeVisible();
                await expect(row(onDay16), '다른 날짜의 일정은 걸러져야 한다').toHaveCount(0);
                await page.getByRole('button', { name: '전체 보기', exact: true }).click();
                await expect(row(onDay16), '전체 보기로 그 달의 일정이 다시 보여야 한다').toBeVisible();

                // 등록 — 날짜 기본값은 화면의 오늘이라 지금 보고 있는 달에 들어간다.
                await page.getByRole('button', { name: '일정 등록', exact: true }).click();
                const createDialog = page.getByRole('dialog', { name: '일정 등록', exact: true });
                await createDialog.locator('input[name="schdlNm"]').fill(created);
                const [createResponse] = await Promise.all([
                    page.waitForResponse((response) => new URL(response.url()).pathname === SCHEDULE_API
                        && response.request().method() === 'POST', RESPONSE_WAIT),
                    createDialog.getByRole('button', { name: '일정 등록', exact: true }).click(),
                ]);
                expect(createResponse.status(), '화면에서 일정 등록이 성공해야 한다').toBe(201);
                createdSn = (await createResponse.json()).data as number;
                expect(createdSn).toBeGreaterThan(0);
                await expect(createDialog).toBeHidden();
                await expect(row(created), '등록한 일정이 다시 읽은 월 목록에 보여야 한다').toBeVisible();
                const stored = await request.get(`${SCHEDULE_API}/${createdSn}`, { headers: auth });
                expect(stored.status()).toBe(200);
                expect((await stored.json()).data).toMatchObject({ schdlNm: created, schdlSeCd: '2' });

                // 수정 — 행의 수정 단추가 기존 값을 실은 폼을 연다.
                await row(created).getByRole('button', { name: `${created} 일정 수정`, exact: true }).click();
                const editDialog = page.getByRole('dialog', { name: '일정 수정', exact: true });
                await expect(editDialog.locator('input[name="schdlNm"]')).toHaveValue(created);
                await editDialog.locator('input[name="schdlNm"]').fill(edited);
                const [updateResponse] = await Promise.all([
                    page.waitForResponse((response) => new URL(response.url()).pathname === `${SCHEDULE_API}/${createdSn}`
                        && response.request().method() === 'PUT', RESPONSE_WAIT),
                    editDialog.getByRole('button', { name: '일정 수정', exact: true }).click(),
                ]);
                expect(updateResponse.status(), '화면에서 일정 수정이 성공해야 한다').toBe(200);
                await expect(editDialog).toBeHidden();
                await expect(row(edited), '수정한 이름이 다시 읽은 월 목록에 보여야 한다').toBeVisible();
                await expect(row(created)).toHaveCount(0);
                const updated = await request.get(`${SCHEDULE_API}/${createdSn}`, { headers: auth });
                expect(updated.status()).toBe(200);
                expect((await updated.json()).data.schdlNm).toBe(edited);

                // 삭제 — 확인 대화상자를 거쳐 실제로 지운다.
                await row(edited).getByRole('button', { name: `${edited} 일정 삭제`, exact: true }).click();
                const confirmation = page.getByRole('dialog', { name: '일정 삭제', exact: true });
                const [deleteResponse] = await Promise.all([
                    page.waitForResponse((response) => new URL(response.url()).pathname === `${SCHEDULE_API}/${createdSn}`
                        && response.request().method() === 'DELETE', RESPONSE_WAIT),
                    confirmation.getByRole('button', { name: '삭제', exact: true }).click(),
                ]);
                expect(deleteResponse.status(), '삭제 확인이 실제 삭제로 이어져야 한다').toBe(200);
                createdDeleted = true;
                await expect(row(edited)).toHaveCount(0);
                const monthly = await request.get(`${SCHEDULE_API}/monthly`, { headers: auth, params: { yearMonth } });
                expect(monthly.status()).toBe(200);
                expect(((await monthly.json()).data as { schdlSn: number }[]).map(schedule => schedule.schdlSn)).not.toContain(createdSn);
            }
            finally {
                // 화면을 먼저 떠난 뒤 이 시험이 만든 일정만 지운다.
                try {
                    await page.goto('about:blank');
                }
                finally {
                    const owned = createdSn && !createdDeleted ? [...fixtures, createdSn] : fixtures;
                    for (const schdlSn of owned) {
                        const cleanup = await request.delete(`${SCHEDULE_API}/${schdlSn}`, { headers: auth });
                        expect(cleanup.status(), '이 시험이 만든 일정을 정리한다').toBe(200);
                    }
                }
            }
        });
        test('부서 일정: 검색·등록·수정·삭제가 서버에 반영된다', async ({ page, request }) => {
            const unique = `${Date.now()}`;
            const today = screenYmd();
            const listed = `${PREFIX}DeptListed_${unique}`;
            const created = `${PREFIX}DeptNew_${unique}`;
            const edited = `${PREFIX}DeptEdited_${unique}`;
            const emptyText = '등록된 부서 일정이 존재하지 않습니다.';
            let listedSn = 0;
            let createdSn = 0;
            let createdDeleted = false;
            const row = (name: string) => page.getByRole('row').filter({ hasText: name });
            const search = page.getByPlaceholder('일정명으로 검색하세요');
            // 검색창은 입력마다 서버를 다시 부른다 — 그 검색어의 응답을 기다린다.
            const searchFor = async (keyword: string) => {
                const [response] = await Promise.all([
                    page.waitForResponse((candidate) => {
                        const url = new URL(candidate.url());
                        return url.pathname === `${SCHEDULE_API}/dept` && candidate.request().method() === 'GET'
                            && url.searchParams.get('schdlNm') === keyword;
                    }, RESPONSE_WAIT),
                    search.fill(keyword),
                ]);
                expect(response.status(), '부서 일정 검색이 성공해야 한다').toBe(200);
            };
            try {
                // 부서 일정 목록은 schdlSeCd='1' 만 싣는다(GET /schedules/dept).
                const res = await request.post(SCHEDULE_API, {
                    headers: auth,
                    data: { schdlNm: listed, schdlBgngYmd: today, schdlEndYmd: today, schdlSeCd: '1' },
                });
                expect(res.status(), '부서 일정 시험용 일정 생성이 성공해야 한다').toBe(201);
                listedSn = (await res.json()).data as number;
                await page.goto('/smart-toolkit/schedule/dept');
                await expect(page.getByRole('heading', { level: 1, name: '부서 일정 관리', exact: true })).toBeVisible({ timeout: 15000 });
                // [2026-11-10 Codex 50차] 제목은 서버가 그린다 — 검색창이 하이드레이션되기 전에 채우면 입력이 화면 상태에 들어가지 않아 검색 요청이 나가지 않는다.
                await waitForHydration(search);

                await searchFor(listed);
                const period = `${today.slice(0, 4)}.${today.slice(4, 6)}.${today.slice(6)}`;
                await expect(row(listed), '서버가 준 부서 일정과 기간이 표에 보여야 한다').toContainText(`${period} ~ ${period}`);
                await searchFor(`${listed}_없음`);
                await expect(page.getByText(emptyText, { exact: true }), '일치하지 않는 검색어는 빈 표가 되어야 한다').toBeVisible();
                await expect(row(listed)).toHaveCount(0);

                // 등록
                await page.getByRole('button', { name: '일정 등록', exact: true }).click();
                const createDialog = page.getByRole('dialog', { name: '일정 등록', exact: true });
                await createDialog.locator('#schdlNm').fill(created);
                const [createResponse] = await Promise.all([
                    page.waitForResponse((response) => new URL(response.url()).pathname === SCHEDULE_API
                        && response.request().method() === 'POST', RESPONSE_WAIT),
                    createDialog.getByRole('button', { name: '저장', exact: true }).click(),
                ]);
                expect(createResponse.status(), '화면에서 부서 일정 등록이 성공해야 한다').toBe(201);
                createdSn = (await createResponse.json()).data as number;
                expect(createdSn).toBeGreaterThan(0);
                await expect(createDialog).toBeHidden();
                await searchFor(created);
                await expect(row(created), '등록한 부서 일정이 목록에 보여야 한다').toBeVisible();
                const stored = await request.get(`${SCHEDULE_API}/${createdSn}`, { headers: auth });
                expect(stored.status()).toBe(200);
                expect((await stored.json()).data).toMatchObject({ schdlNm: created, schdlSeCd: '1' });

                // 수정
                await row(created).getByRole('button', { name: `${created} 수정`, exact: true }).click();
                const editDialog = page.getByRole('dialog', { name: '일정 수정', exact: true });
                await expect(editDialog.locator('#schdlNm')).toHaveValue(created);
                await editDialog.locator('#schdlNm').fill(edited);
                const [updateResponse] = await Promise.all([
                    page.waitForResponse((response) => new URL(response.url()).pathname === `${SCHEDULE_API}/${createdSn}`
                        && response.request().method() === 'PUT', RESPONSE_WAIT),
                    editDialog.getByRole('button', { name: '저장', exact: true }).click(),
                ]);
                expect(updateResponse.status(), '화면에서 부서 일정 수정이 성공해야 한다').toBe(200);
                await expect(editDialog).toBeHidden();
                await searchFor(edited);
                await expect(row(edited), '수정한 이름이 목록에 보여야 한다').toBeVisible();
                const updated = await request.get(`${SCHEDULE_API}/${createdSn}`, { headers: auth });
                expect(updated.status()).toBe(200);
                expect((await updated.json()).data.schdlNm).toBe(edited);

                // 삭제
                await row(edited).getByRole('button', { name: `${edited} 삭제`, exact: true }).click();
                const confirmation = page.getByRole('dialog', { name: '일정 삭제', exact: true });
                const [deleteResponse] = await Promise.all([
                    page.waitForResponse((response) => new URL(response.url()).pathname === `${SCHEDULE_API}/${createdSn}`
                        && response.request().method() === 'DELETE', RESPONSE_WAIT),
                    confirmation.getByRole('button', { name: '삭제', exact: true }).click(),
                ]);
                expect(deleteResponse.status(), '삭제 확인이 실제 삭제로 이어져야 한다').toBe(200);
                createdDeleted = true;
                await expect(row(edited)).toHaveCount(0);
                await expect(page.getByText(emptyText, { exact: true })).toBeVisible();
                const gone = await request.get(`${SCHEDULE_API}/${createdSn}`, { headers: auth });
                expect(gone.status(), '삭제한 일정을 다시 조회하면 404여야 한다').toBe(404);
            }
            finally {
                try {
                    await page.goto('about:blank');
                }
                finally {
                    const owned = [listedSn, createdDeleted ? 0 : createdSn].filter(schdlSn => schdlSn > 0);
                    for (const schdlSn of owned) {
                        const cleanup = await request.delete(`${SCHEDULE_API}/${schdlSn}`, { headers: auth });
                        expect(cleanup.status(), '이 시험이 만든 일정을 정리한다').toBe(200);
                    }
                }
            }
        });
    });
});
