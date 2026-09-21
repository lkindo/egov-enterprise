import { expect,test } from '../fixtures/browser-test';
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
