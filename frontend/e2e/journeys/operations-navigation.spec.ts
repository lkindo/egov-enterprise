import { expect,test } from '../fixtures/browser-test';
test.describe('Operational Extension & Uncovered Modules', () => {
    test.use({ storageState: 'playwright/.auth/admin.json' });
    test("외부 인사 목록을 검색하고 등록 버튼을 표시한다", async ({ operationalPage }) => {
        await operationalPage.gotoExternalHr();
        // Search
        await operationalPage.searchExternalHr('홍길동');
        // Verify button
        await expect(operationalPage.page.getByRole('button', { name: '인사 등록' })).toBeVisible();
    });
    test("메모 보고 탭을 전환해도 허브 제목이 유지된다", async ({ operationalPage }) => {
        await operationalPage.gotoMemoReports();
        // 탭 전환 — 각 전환 뒤 허브가 살아 있는지 확인한다.
        // [2026-08-10 정정] 종전에는 마지막에 `const noData = …isVisible(); if (noData) console.log(…)`
        //   뿐이었다. 즉 **단언이 하나도 없는 꼬리**였다: 빈 상태든 아니든, 심지어 화면이 깨져도
        //   그 블록은 아무것도 실패시키지 않는다. 죽은 분기를 지우고, 탭 전환 후에도 허브가
        //   유지되는지를 실제로 단언한다(전환 중 언마운트·크래시가 나면 여기서 red 가 된다).
        //   ⚠ 이것은 스모크다 — '어느 탭이 활성인가'나 '데이터가 맞는가'는 검증하지 않는다.
        //     그 이상을 주장하지 않기 위해 단언 범위를 명시해 둔다.
        for (const tab of ['발신함', '전체', '수신함']) {
            await operationalPage.switchReportTab(tab);
            await expect(operationalPage.page.getByRole('heading', { name: '메모 보고 관리', exact: true }), `'${tab}' 탭 전환 후 메모 보고 허브가 사라졌다`).toBeVisible();
        }
    });
});
