import { test, expect } from './fixtures/base-test';

/**
 * [Modernization] Hierarchy & D&D Interface Verification
 * 
 * Target Modules:
 * 1. Menus (System Management)
 * 2. Common Code (System Management)
 * 3. Departments (User/Org Hub)
 */

test.describe('Modernization: Hierarchical Interface Verification', () => {
    test.use({ storageState: 'playwright/.auth/admin.json' });

    test('Menu Management Tree Interface', async ({ page }) => {
        console.log('\n>>> Testing Menu Management Tree');
        await page.goto('/admin/system/menus');
        
        // Wait for tree container
        await expect(page.locator('text=네비게이션 트리').first()).toBeVisible({ timeout: 20000 });
        
        // Check for node elements (ID: prefix)
        const nodes = page.getByText(/ID: \d+/);
        await expect(nodes.first()).toBeVisible({ timeout: 15000 });
        
        // Verify that data-driven modern routes are applied (e.g. valid URLs, not # unless leaf)
        const linkWithModernRoute = page.locator('a[href^="/admin/"]').first();
        if (await linkWithModernRoute.isVisible()) {
            await expect(linkWithModernRoute).toHaveAttribute('href', /^\/admin\/.+/);
        }

        console.log('>>> Menu Tree UI & Data-Driven Route: PASS');
    });

    test('Menu useYn State Filtering', async ({ page, request }) => {
        console.log('\n>>> Testing Menu useYn State Filtering');
        
        // Setup: Admin creates or updates a menu to use_yn = 'N' via API
        // For E2E simulation, we check if the LNB tree API filters inactive menus
        const response = await request.get('/api/v1/user/system/menus/hierarchy');
        // [E2E 감사 B] 이중 가드(if ok / if data) 제거 — 200 응답 + 비어있지 않은 트리를 요구한 뒤 재귀 검증한다.
        // (과거: 엔드포인트 실패나 빈 배열도 조용히 통과해 필터링을 한 번도 검증하지 못했음)
        expect(response.ok(), `menus/hierarchy 엔드포인트 응답 실패: ${response.status()}`).toBeTruthy();
        const hierarchy = await response.json();
        const rootNodes = hierarchy?.data ?? [];
        expect(Array.isArray(rootNodes) && rootNodes.length > 0, 'LNB 계층 트리가 비어 있어 useYn 필터링을 검증할 수 없음').toBeTruthy();

        const checkNoInactiveMenus = (nodes: any[]) => {
            for (const node of nodes) {
                expect(node.useYn).not.toBe('N');
                if (node.children && node.children.length > 0) {
                    checkNoInactiveMenus(node.children);
                }
            }
        };
        checkNoInactiveMenus(rootNodes);
        console.log('>>> useYn Filtering verified via API: PASS');
    });

    test('Common Code Explorer Interface', async ({ page }) => {
        console.log('\n>>> Testing Common Code Explorer');
        await page.goto('/admin/system/common-code');
        
        // Wait for explorer aside
        await expect(page.locator('text=Explorer').first()).toBeVisible({ timeout: 20000 });
        
        // Check for cluster/domain items
        const domains = page.getByText(/\d+ Domains/);
        await expect(domains).toBeVisible({ timeout: 15000 });
        
        console.log('>>> Common Code Explorer UI: PASS');
    });

    test('Department Topology Tree (Hub)', async ({ page }) => {
        console.log('\n>>> Testing Department Topology Tree in Hub');
        await page.goto('/admin/user/manage');
        
        // Switch to DEPTS tab
        const deptTab = page.locator('button:has-text("부서 관리")').first();
        await expect(deptTab).toBeVisible();
        await deptTab.click();
        
        // Wait for tree title
        await expect(page.locator('text=조직 구조').first()).toBeVisible({ timeout: 20000 });
        
        // Check for topology nodes (e.g., ORGNZT_0000000000001)
        const deptNodes = page.getByText(/ORGNZT_\d+/);
        await expect(deptNodes.first()).toBeVisible({ timeout: 15000 });
        
        console.log('>>> Department Topology Tree UI: PASS');
    });

    test('Atomic Hierarchy Save Button Visibility', async ({ page }) => {
        console.log('\n>>> Testing Save Button Appearance after Drag (Simulated)');
        await page.goto('/admin/user/manage');
        
        // Switch to DEPTS tab
        await page.locator('button:has-text("부서 관리")').click();

        // [E2E 감사 B] 부서 트리가 실제로 로드됐는지(positive) 먼저 단언 — 그래야 'Save 버튼 부재'가 의미를 가짐.
        // (과거: not.toBeVisible만 있어 기능이 아예 렌더되지 않는 페이지도 vacuously 통과)
        // TODO(Phase4+): 실제 D&D 재정렬을 수행하고 Save 버튼이 '나타나는지' + 저장 영속을 positive 검증.
        await expect(page.locator('text=조직 구조').first()).toBeVisible({ timeout: 20000 });
        const saveBtn = page.locator('button:has-text("Save Structure")');
        await expect(saveBtn).not.toBeVisible();

        console.log('>>> Initial Save Button State: PASS');
    });
});
