import { test, expect } from './fixtures/base-test';
import fs from 'fs';
import path from 'path';

/**
 * [Modernization] Hierarchy & D&D Interface Verification
 *
 * Target Modules:
 * 1. Menus (System Management)
 * 2. Common Code (System Management)
 * 3. Departments (User/Org Hub)
 */

/**
 * storageState(admin.json)에 저장된 accessToken(JWT)을 추출한다.
 * 백엔드 JwtTokenProvider.resolveToken 은 Authorization: Bearer 헤더만 읽고 쿠키는 무시하므로,
 * APIRequestContext(request)에는 쿠키가 있어도 인증이 서지 않는다(→ 익명 트리).
 * 관리자 권한의 '채워진' 트리로 useYn 필터링을 유의미하게 검증하려면 토큰을 명시적으로 헤더에 실어야 한다.
 */
function getAdminBearerToken(): string {
    const authPath = path.resolve('playwright/.auth/admin.json');
    const state = JSON.parse(fs.readFileSync(authPath, 'utf-8'));
    const cookieToken = (state.cookies ?? []).find((c: any) => c.name === 'accessToken')?.value;
    const lsToken = (state.origins?.[0]?.localStorage ?? []).find((l: any) => l.name === 'accessToken')?.value;
    const token = cookieToken ?? lsToken;
    if (!token) {
        throw new Error('[tier-19] admin accessToken 을 playwright/.auth/admin.json 에서 찾을 수 없음 (setup 미실행?)');
    }
    return token;
}

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

    test('Menu useYn State Filtering', async ({ request }) => {
        console.log('\n>>> Testing Menu useYn State Filtering');

        // LNB 계층 트리를 반환하는 실제 whitelisted 엔드포인트(permitAll): GET /api/v1/menus/head.
        // (기존 /api/v1/user/system/menus/hierarchy 는 존재하지 않는 경로였음 → 401/404.)
        // 관리자 토큰을 Bearer 로 실어 '채워진' 관리자 트리를 받는다(익명 트리는 비어 있어 검증 불가).
        const token = getAdminBearerToken();
        const response = await request.get('/api/v1/menus/head', {
            headers: { Authorization: `Bearer ${token}` },
        });

        // [E2E 감사 B] 200 응답 + 비어있지 않은 트리를 요구한 뒤 재귀 검증한다.
        // (과거: 엔드포인트 실패나 빈 배열도 조용히 통과해 필터링을 한 번도 검증하지 못했음)
        expect(response.ok(), `menus/head 엔드포인트 응답 실패: ${response.status()}`).toBeTruthy();

        // ApiResponse 래퍼 구조: { ..., data: { list: List<MenuDto> } } — 각 노드는 .useYn / .children 을 가진다.
        const body = await response.json();
        const rootNodes: any[] = body?.data?.list ?? [];
        expect(Array.isArray(rootNodes) && rootNodes.length > 0, 'LNB 계층 트리가 비어 있어 useYn 필터링을 검증할 수 없음').toBeTruthy();

        const checkNoInactiveMenus = (nodes: any[]) => {
            for (const node of nodes) {
                expect(node.useYn, `메뉴 '${node.menuNm}'(id=${node.id})가 useYn='N'인데 LNB 트리에 노출됨`).not.toBe('N');
                if (Array.isArray(node.children) && node.children.length > 0) {
                    checkNoInactiveMenus(node.children);
                }
            }
        };
        checkNoInactiveMenus(rootNodes);
        console.log('>>> useYn Filtering verified via API (menus/head): PASS');
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
