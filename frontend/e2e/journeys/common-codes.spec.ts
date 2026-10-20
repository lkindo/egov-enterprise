import { randomBytes } from 'node:crypto';
import type { Page } from '@playwright/test';
import { expect,test } from '../fixtures/browser-test';

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
