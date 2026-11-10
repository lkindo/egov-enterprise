import { randomBytes } from 'node:crypto';
import type { Page, Response } from '@playwright/test';
import { expect,test } from '../fixtures/browser-test';
import { waitForHydration } from '../fixtures/hydration';

/** 그룹을 검색으로 좁혀 마스터 항목을 고른다 — 공통코드 화면은 주소값(?groupId=)으로 그룹을 열지 않는다. */
async function selectGroup(page: Page, cdId: string) {
    const master = page.getByTestId('master-detail-page').getByTestId('master-detail-master');
    await page.getByRole('textbox', { name: '분류·그룹명 또는 코드로 검색', exact: true }).fill(cdId);
    const group = master.locator(`[data-a2-master-item-type="group"][aria-label*="(${cdId}) 선택"]`);
    await expect(group).toHaveCount(1, { timeout: 20_000 });
    await group.click();
    await expect(group).toHaveAttribute('aria-current', 'true');
}

test.describe('Modernization: Hierarchical Interface Verification', () => {
    test.use({ storageState: 'playwright/.auth/admin.json' });
    test('Common Code A2 Master-Detail Interface', async ({ page }) => {
        console.log('\n>>> Testing Common Code A2 Master-Detail Interface');
        await page.goto('/admin/system/common-code');
        await expect(page.getByRole('heading', { level: 1, name: '코드 관리', exact: true })).toBeVisible({ timeout: 20000 });
        await expect(page.getByRole('heading', { level: 2, name: '공통 코드 관리', exact: true })).toHaveCount(1);
        const workArea = page.getByTestId('master-detail-page');
        await expect(workArea).toHaveCount(1);
        const master = workArea.getByTestId('master-detail-master');
        const detail = workArea.getByTestId('master-detail-detail');
        await expect(master).toHaveCount(1);
        await expect(detail).toHaveCount(1);
        await expect(page.getByRole('textbox', { name: '분류·그룹명 또는 코드로 검색', exact: true })).toHaveCount(1);
        // 분류/그룹의 표시명이나 seed ID 대신 A2의 안정 마커로 첫 그룹을 선택한다.
        const masterItems = master.locator('[data-a2-master-item]');
        const groupItems = master.locator('[data-a2-master-item][data-a2-master-item-type="group"]');
        await expect(groupItems.first()).toBeVisible({ timeout: 15000 });
        const firstGroup = groupItems.first();
        const firstGroupIndex = await masterItems.evaluateAll((items) => (items.findIndex((item) => item.getAttribute('data-a2-master-item-type') === 'group')));
        expect(firstGroupIndex, '첫 그룹은 A2 마스터 항목 집합에 포함되어야 한다').toBeGreaterThanOrEqual(0);
        expect(firstGroupIndex, 'ArrowDown으로 이동할 다음 마스터 항목이 있어야 한다').toBeLessThan(await masterItems.count() - 1);
        await firstGroup.click();
        await expect(firstGroup).toHaveAttribute('aria-current', 'true');
        const nextItem = masterItems.nth(firstGroupIndex + 1);
        await firstGroup.press('ArrowDown');
        await expect(nextItem).toBeFocused();
        await expect(nextItem).toHaveAttribute('aria-current', 'true');
        await expect(firstGroup).not.toHaveAttribute('aria-current');
        // 선택 그룹으로 돌아가 Tab을 누르면 상세의 첫 실행 가능 액션으로 바로 진입해야 한다.
        await firstGroup.click();
        const firstDetailAction = workArea.getByRole('button', { name: '신규 상세 코드 등록', exact: true });
        await expect(firstDetailAction).toBeVisible({ timeout: 15000 });
        await firstGroup.press('Tab');
        await expect(firstDetailAction).toBeFocused();
        // 상세에서 역방향으로 이동해도 동일한 선택 항목으로 돌아와야 한다.
        await firstDetailAction.press('Shift+Tab');
        await expect(firstGroup).toBeFocused();
        // 실제 dnd-kit KeyboardSensor 경로에서 한국어 안내와 취소 결과를 확인한다.
        const selectedGroupRow = firstGroup.locator('xpath=..');
        const selectedGroupHandle = selectedGroupRow.getByRole('button', { name: /소속 분류 이동 핸들 — 현재 / });
        await expect(master.locator('button[aria-roledescription="코드 그룹 소속 분류 이동 핸들"][tabindex="0"]')).toHaveCount(1);
        await firstGroup.press('Shift+Tab');
        await expect(selectedGroupHandle).toBeFocused();
        await selectedGroupHandle.press('Space');
        await expect(selectedGroupHandle).toHaveAttribute('aria-pressed', 'true');
        const dndLiveRegion = page.locator('[role="status"]').filter({
            hasText: /같은 분류 안의 순서는 저장되지 않습니다/,
        });
        await expect(dndLiveRegion).toHaveCount(1);
        await expect(dndLiveRegion).toContainText('그룹은 현재');
        await selectedGroupHandle.press('ArrowDown');
        await selectedGroupHandle.press('Escape');
        await expect(page.locator('[role="status"]').filter({ hasText: /그룹 이동을 취소했습니다/ })).toHaveCount(1);
        await expect(selectedGroupHandle).toBeFocused();
        await expect(workArea.getByRole('button', { name: '그룹 소속 저장', exact: true })).toBeDisabled();
        // 320px에서도 단일 DOM을 유지하고 마스터를 내부 스크롤 영역으로 제한한다.
        await page.setViewportSize({ width: 320, height: 720 });
        await expect(workArea).toBeVisible();
        await expect(master).toHaveCount(1);
        await expect(detail).toHaveCount(1);
        const reflow = await master.evaluate((element) => {
            const style = window.getComputedStyle(element);
            return {
                pageClientWidth: document.documentElement.clientWidth,
                pageScrollWidth: document.documentElement.scrollWidth,
                masterMaxHeight: style.maxHeight,
                masterOverflowY: style.overflowY,
            };
        });
        expect(reflow.pageScrollWidth).toBeLessThanOrEqual(reflow.pageClientWidth + 1);
        expect(reflow.masterMaxHeight).not.toBe('none');
        expect(reflow.masterOverflowY).toBe('auto');
        console.log('>>> Common Code A2 Master-Detail UI: PASS');
    });
});

/**
 * 공통코드 변경 이력 여정(2026-10-20) — 상세 코드를 화면에서 등록하고 고치면, 그 그룹의 '변경 이력'이 두 변경을 말한다.
 * 같은 화면이 그룹마다 이 제품이 그 그룹을 읽는지(사용처)를 말하는지도 본다: 결재 업무 구분(COM075)은 읽는 그룹, 이 테스트가
 * 만든 그룹은 읽지 않는 그룹이다.
 *
 * 분류·그룹은 API 로 만든다(구조 편집 화면은 CommonCodeClient.structure 단위 시험이 본다). 식별자는 'Z' 로 시작해 탐색기
 * 맨 뒤에 놓인다 — 다른 여정이 고르는 '첫 그룹'을 바꾸지 않는다. 공통코드 삭제는 사용 안 함 표시이므로 정리는 화면을 떠난 뒤
 * 분류·그룹을 사용 안 함으로 돌린다(일회용 E2E DB).
 */
test.describe('공통코드 변경 이력과 사용처', () => {
    test.use({ storageState: 'playwright/.auth/admin.json' });
    test('상세 코드 등록·수정은 변경 이력에 남고, 그룹마다 이 제품이 읽는지 말한다', async ({ page, adminRequest }) => {
        const suffix = randomBytes(4).toString('hex').toUpperCase();
        const clsfCd = `ZE2E${suffix.slice(0, 6)}`;
        const cdId = `ZE2EGRP${suffix}`;
        const groupName = `E2E 이력 그룹 ${suffix}`;
        const createdClassification = await adminRequest.post('/api/v1/admin/system/codes/cl', {
            data: { clsfCd, clsfCdNm: `E2E 이력 분류 ${suffix}`, clsfCdExpln: '변경 이력 여정 전용', useYn: 'Y' },
        });
        expect(createdClassification.status(), '여정 전용 분류 등록').toBe(201);
        const createdGroup = await adminRequest.post('/api/v1/admin/system/codes/cmmn', {
            data: { cdId, cdIdNm: groupName, cdIdExpln: '변경 이력 여정 전용', clsfCd, useYn: 'Y' },
        });
        expect(createdGroup.status(), '여정 전용 그룹 등록').toBe(201);
        try {
            await test.step('이 제품이 읽는 그룹은 사용처를 말한다', async () => {
                await page.goto('/admin/system/common-code');
                await selectGroup(page, 'COM075');
                const usage = page.getByRole('region', { name: '이 제품이 읽는 그룹', exact: true });
                await expect(usage).toBeVisible({ timeout: 20_000 });
                await expect(usage).toContainText('결재 기안의 업무 구분 선택지');
            });

            await page.goto('/admin/system/common-code');
            await selectGroup(page, cdId);
            const workArea = page.getByTestId('master-detail-page');
            await expect(workArea.getByRole('region', { name: '이 제품이 읽지 않는 그룹', exact: true })).toBeVisible({ timeout: 20_000 });

            await test.step('상세 코드를 등록한다', async () => {
                await workArea.getByRole('button', { name: '신규 상세 코드 등록', exact: true }).click();
                const dialog = page.getByRole('dialog', { name: '신규 명세 등록' });
                await dialog.getByLabel(/코드 식별자/).fill('D1');
                await dialog.getByLabel(/표기 레이블/).fill('처음 이름');
                await dialog.getByRole('button', { name: '저장', exact: true }).click();
                await expect(dialog).toBeHidden({ timeout: 20_000 });
                await expect(workArea.getByText('처음 이름', { exact: true })).toBeVisible({ timeout: 20_000 });
            });

            await test.step('상세 코드의 이름을 고친다', async () => {
                await workArea.getByRole('button', { name: '처음 이름 코드 수정', exact: true }).click();
                const dialog = page.getByRole('dialog', { name: '아키텍처 명세 수정' });
                const label = dialog.getByLabel(/표기 레이블/);
                await expect(label).toHaveValue('처음 이름');
                await label.fill('바꾼 이름');
                await dialog.getByRole('button', { name: '저장', exact: true }).click();
                await expect(dialog).toBeHidden({ timeout: 20_000 });
                await expect(workArea.getByText('바꾼 이름', { exact: true })).toBeVisible({ timeout: 20_000 });
            });

            await test.step('그룹의 변경 이력이 등록과 이름 변경을 말한다', async () => {
                await workArea.getByRole('button', { name: '변경 이력', exact: true }).click();
                const history = page.getByRole('dialog', { name: `${groupName} 변경 이력` });
                const rows = history.getByRole('row');
                const added = rows.filter({ hasText: '상세 코드 D1' }).filter({ hasText: '등록' });
                const renamed = rows.filter({ hasText: '상세 코드 D1' }).filter({ hasText: '수정' });
                await expect(added).toHaveCount(1, { timeout: 20_000 });
                await expect(renamed).toHaveCount(1);
                await expect(renamed).toContainText('명칭');
                await expect(renamed).toContainText('처음 이름');
                await expect(renamed).toContainText('바꾼 이름');
            });

            // [2026-11-10] 상세 코드 삭제는 행을 지우지 않고 사용 안 함으로 바꾼다(CommonCodeService#deleteCmmnDetailCode). 그래서
            //   행이 목록에서 사라지는지를 보지 않고, 서버가 남긴 삭제 이력과 저장된 사용 여부를 본다.
            await test.step('상세 코드를 삭제하면 사용 안 함으로 바뀌고 변경 이력이 그 삭제를 말한다', async () => {
                const history = page.getByRole('dialog', { name: `${groupName} 변경 이력` });
                await history.getByLabel('닫기', { exact: true }).click();
                await expect(history).toBeHidden();
                await workArea.getByRole('button', { name: '바꾼 이름 코드 삭제', exact: true }).click();
                await page.getByRole('dialog', { name: '상세 코드 삭제' }).getByRole('button', { name: '삭제', exact: true }).click();
                await expect(page.locator('[data-sonner-toast][data-type="success"]').filter({ hasText: '상세 코드가 삭제되었습니다.' }).first())
                    .toBeVisible({ timeout: 20_000 });
                await workArea.getByRole('button', { name: '변경 이력', exact: true }).click();
                const removed = history.getByRole('row').filter({ hasText: '상세 코드 D1' }).filter({ hasText: '삭제(사용 안 함)' });
                await expect(removed).toHaveCount(1, { timeout: 20_000 });
                const stored = await adminRequest.get(`/api/v1/admin/system/codes/detail/${cdId}/D1`);
                expect(stored.status(), '삭제한 상세 코드 조회').toBe(200);
                expect((await stored.json()).data).toMatchObject({ dtlCd: 'D1', dtlCdNm: '바꾼 이름', useYn: 'N' });
            });
        } finally {
            // 열린 화면의 데이터를 먼저 지우지 않는다 — 화면을 떠난 뒤 정리한다.
            await page.goto('/');
            const removedGroup = await adminRequest.delete(`/api/v1/admin/system/codes/cmmn/${cdId}`);
            const removedClassification = await adminRequest.delete(`/api/v1/admin/system/codes/cl/${clsfCd}`);
            expect(removedGroup.status(), '여정 전용 그룹 정리').toBe(200);
            expect(removedClassification.status(), '여정 전용 분류 정리').toBe(200);
        }
    });
});

/**
 * 행정 구역 코드 여정(2026-11-10) — 코드 관리의 '행정 표준' 탭에서 코드를 등록하고, 행정구역명 조회가 목록을 그 이름대로 바꾸고,
 * 새로고침이 서버에서 다시 읽고, 고친 이름과 삭제가 서버에 반영되는지 본다.
 *
 * 서버의 형식 검사는 길이뿐이다(AdministCodeDto 12자, 화면 10자, 숫자 검사 없음). 이 시험만 쓰는 '90'·'91' 로 시작하는 10자리 코드를
 * 쓰고 상위를 두지 않는다 — 삭제는 물리 삭제이고 하위가 있으면 409 다. 비교용 코드 하나는 API 로 만든다: 조회어가 다른 행을
 * 걸러 내는지 보려는 것이며 이 여정이 증명하는 동작이 아니다.
 */
test.describe('행정 구역 코드 관리', () => {
    test.use({ storageState: 'playwright/.auth/admin.json' });
    test('행정 구역 코드를 화면에서 등록·조회·새로고침·수정·삭제한다', async ({ page, adminRequest }) => {
        const ADMINIST = '/api/v1/admin/system/codes/administ';
        const suffix = randomBytes(4).toString('hex').toUpperCase();
        const stamp = Date.now().toString().slice(-8);
        const code = `90${stamp}`;
        const otherCode = `91${stamp}`;
        const name = `E2E 행정 ${suffix}`;
        const otherName = `E2E 비교 ${suffix}`;
        // 고친 이름도 조회어(name)를 품는다 — 고친 뒤 같은 조회 결과에 남아 있어야 화면에서 확인할 수 있다.
        const renamed = `${name} 수정본`;
        const owned = new Set<string>();
        const listedFor = (keyword: string) => (response: Response) => response.request().method() === 'GET'
            && new URL(response.url()).pathname === ADMINIST
            && new URL(response.url()).searchParams.get('searchKeyword') === keyword;
        const other = await adminRequest.post(ADMINIST, {
            data: { admdstCd: otherCode, admdstSeCd: '1', admdstZoneNm: otherName, upAdmdstCd: '', useYn: 'Y' },
        });
        expect(other.status(), '비교용 행정 구역 코드 등록').toBe(201);
        owned.add(otherCode);
        try {
            await page.goto('/admin/system/common-code');
            await expect(page.getByRole('heading', { level: 1, name: '코드 관리', exact: true })).toBeVisible({ timeout: 20_000 });
            const administTab = page.getByRole('tab', { name: '행정 표준', exact: true });
            await waitForHydration(administTab);
            await administTab.click();
            await expect(administTab).toHaveAttribute('aria-selected', 'true');
            await expect(page.getByRole('heading', { level: 2, name: '행정 구역 코드 관리', exact: true })).toBeVisible({ timeout: 20_000 });

            await test.step('행정 구역 코드를 등록한다', async () => {
                await page.getByRole('button', { name: '신규 등록', exact: true }).click();
                const dialog = page.getByRole('dialog', { name: '행정 구역 코드 등록' });
                await dialog.getByPlaceholder('예: 1111051500').fill(code);
                await dialog.getByPlaceholder('예: 서울특별시 종로구 청운효자동').fill(name);
                const created = page.waitForResponse((response) => response.request().method() === 'POST'
                    && new URL(response.url()).pathname === ADMINIST);
                await dialog.getByRole('button', { name: '최종 등록', exact: true }).click();
                const status = (await created).status();
                if (status === 201) owned.add(code);
                expect(status, '화면의 행정 구역 코드 등록').toBe(201);
                await expect(dialog).toBeHidden();
            });

            const keyword = page.getByRole('textbox', { name: '행정구역명', exact: true });
            const search = async (value: string) => {
                const listed = page.waitForResponse(listedFor(value));
                await keyword.fill(value);
                await page.getByRole('button', { name: '조회', exact: true }).click();
                expect((await listed).ok(), `'${value}' 조회가 성공해야 한다`).toBeTruthy();
            };
            const editOf = (zoneName: string) => page.getByRole('button', { name: `${zoneName} 수정`, exact: true });

            await test.step('행정구역명 조회가 목록을 그 이름의 코드로 바꾼다', async () => {
                await search(otherName);
                await expect(editOf(otherName)).toBeVisible({ timeout: 20_000 });
                await expect(editOf(name)).toHaveCount(0);
                await search(name);
                await expect(editOf(name)).toBeVisible({ timeout: 20_000 });
                await expect(editOf(otherName)).toHaveCount(0);
            });

            await test.step('새로고침이 지금 조회어의 목록을 서버에서 다시 읽는다', async () => {
                const refreshed = page.waitForResponse(listedFor(name));
                await page.getByRole('button', { name: '행정 구역 목록 새로고침', exact: true }).click();
                expect((await refreshed).ok(), '새로고침의 재조회가 성공해야 한다').toBeTruthy();
                await expect(editOf(name)).toBeVisible();
            });

            await test.step('행정구역명을 고친다', async () => {
                await editOf(name).click();
                const dialog = page.getByRole('dialog', { name: '행정 구역 코드 수정' });
                const zoneName = dialog.getByPlaceholder('예: 서울특별시 종로구 청운효자동');
                await expect(zoneName).toHaveValue(name);
                await zoneName.fill(renamed);
                const updated = page.waitForResponse((response) => response.request().method() === 'PUT'
                    && new URL(response.url()).pathname === `${ADMINIST}/${code}`);
                await dialog.getByRole('button', { name: '저장', exact: true }).click();
                expect((await updated).ok(), '화면의 행정 구역 코드 수정').toBeTruthy();
                await expect(dialog).toBeHidden();
                await expect(editOf(renamed)).toBeVisible({ timeout: 20_000 });
                const stored = await adminRequest.get(`${ADMINIST}/${code}`);
                expect(stored.status(), '고친 행정 구역 코드 조회').toBe(200);
                expect((await stored.json()).data).toMatchObject({ admdstCd: code, admdstZoneNm: renamed });
            });

            await test.step('행정 구역 코드를 삭제한다', async () => {
                await page.getByRole('button', { name: `${renamed} 삭제`, exact: true }).click();
                const deleted = page.waitForResponse((response) => response.request().method() === 'DELETE'
                    && new URL(response.url()).pathname === `${ADMINIST}/${code}`);
                await page.getByRole('dialog', { name: '행정 구역 코드 삭제' }).getByRole('button', { name: '삭제', exact: true }).click();
                expect((await deleted).ok(), '화면의 행정 구역 코드 삭제').toBeTruthy();
                owned.delete(code);
                // 삭제 뒤 화면은 같은 조회어로 다시 읽는다 — 서버가 0건이라고 답해야 빈 상태 문구가 보인다.
                await expect(page.getByText(`"${name}"에 대한 검색 결과가 없습니다.`, { exact: true }).first()).toBeVisible({ timeout: 20_000 });
                const remaining = await adminRequest.get(ADMINIST, { params: { searchKeyword: name } });
                expect(remaining.status(), '삭제 뒤 행정 구역 코드 조회').toBe(200);
                expect((await remaining.json()).data.total).toBe(0);
            });
        } finally {
            // 열린 화면의 데이터를 먼저 지우지 않는다 — 화면을 떠난 뒤 정리한다.
            await page.goto('about:blank');
            const cleanup: Array<[string, number]> = [];
            for (const owner of owned) {
                cleanup.push([owner, (await adminRequest.delete(`${ADMINIST}/${owner}`)).status()]);
            }
            expect(cleanup, '여정 전용 행정 구역 코드 정리').toEqual([...owned].map(owner => [owner, 200]));
        }
    });
});
