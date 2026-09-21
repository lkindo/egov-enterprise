import { expect,test } from '../fixtures/api-test';
import { getAdminBearerToken } from '../utils/admin-token';
test.describe('Modernization: Hierarchical Interface Verification', () => {
    test.use({ storageState: 'playwright/.auth/admin.json' });
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
        expect(rootNodes.map(node => node.menuNm)).toEqual(['나의 업무', '소통·지식', '참여', '관리 센터']);
        const visible: any[] = [];
        const collect = (nodes: any[], depth: number) => {
            expect(depth).toBeLessThanOrEqual(3);
            for (const node of nodes) {
                visible.push(node);
                if (node.children?.length)
                    collect(node.children, depth + 1);
            }
        };
        collect(rootNodes, 1);
        expect(visible).toHaveLength(71);
        expect(visible.filter(node => node.modernRoute === '/admin/security/authority')).toHaveLength(1);
        expect(visible.some(node => node.menuNm === '화면 구성 예제')).toBe(false);
        console.log('>>> useYn Filtering verified via API (menus/head): PASS');
    });
});
