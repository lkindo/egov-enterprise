import fs from 'fs';
import path from 'path';
import { expect,test } from '../fixtures/api-test';
import { getAdminBearerToken } from '../utils/admin-token';

// 메뉴 수의 확인 지점은 사람이 검토하는 메뉴 스냅숏(원본 마이그레이션 적용 결과, MENU_SNAPSHOT_STALE 이 신선도를 본다)이다.
// 관리자 트리는 서버(MenuService.buildMenuTree)와 같은 정의로 센다 — 관리자 계정 그룹(ROLE_ADMIN, R__seed_framework)의
// 메뉴 배정이 있고 사용 중이며, 위 메뉴가 모두 같은 조건으로 트리에 붙는 메뉴다.
interface SnapshotMenu { menu_sn: number; up_menu_sn: number | null; use_yn: string }
interface MenuSnapshot { menus: SnapshotMenu[]; navigation: { authrt_cd: string; menu_sn: number }[] }
const ADMIN_GROUPS = new Set(['ROLE_ADMIN']);
function adminVisibleMenuCount(snapshot: MenuSnapshot): number {
    const granted = new Set(snapshot.navigation.filter(row => ADMIN_GROUPS.has(row.authrt_cd)).map(row => row.menu_sn));
    const shown = new Map(snapshot.menus.filter(menu => menu.use_yn === 'Y' && granted.has(menu.menu_sn))
        .map(menu => [menu.menu_sn, menu]));
    const attached = (menu: SnapshotMenu): boolean => menu.up_menu_sn === null || menu.up_menu_sn === 0
        || (shown.has(menu.up_menu_sn) && attached(shown.get(menu.up_menu_sn)!));
    return [...shown.values()].filter(attached).length;
}
const MENU_SNAPSHOT: MenuSnapshot = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, '../../../config/project-composer-menus.json'), 'utf8'));

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
        interface MenuNode {
            id?: number | string;
            menuNm?: string;
            useYn?: string;
            modernRoute?: string;
            children?: MenuNode[];
        }
        // ApiResponse 래퍼 구조: { ..., data: { list: List<MenuDto> } } — 각 노드는 .useYn / .children 을 가진다.
        const body = await response.json();
        const rootNodes: MenuNode[] = body?.data?.list ?? [];
        expect(Array.isArray(rootNodes) && rootNodes.length > 0, 'LNB 계층 트리가 비어 있어 useYn 필터링을 검증할 수 없음').toBeTruthy();
        const checkNoInactiveMenus = (nodes: MenuNode[]) => {
            for (const node of nodes) {
                expect(node.useYn, `메뉴 '${node.menuNm}'(id=${node.id})가 useYn='N'인데 LNB 트리에 노출됨`).not.toBe('N');
                if (Array.isArray(node.children) && node.children.length > 0) {
                    checkNoInactiveMenus(node.children);
                }
            }
        };
        checkNoInactiveMenus(rootNodes);
        expect(rootNodes.map(node => node.menuNm)).toEqual(['나의 업무', '소통·지식', '참여', '관리 센터']);
        const visible: MenuNode[] = [];
        const collect = (nodes: MenuNode[], depth: number) => {
            expect(depth).toBeLessThanOrEqual(3);
            for (const node of nodes) {
                visible.push(node);
                if (node.children?.length)
                    collect(node.children, depth + 1);
            }
        };
        collect(rootNodes, 1);
        const expectedVisible = adminVisibleMenuCount(MENU_SNAPSHOT);
        expect(expectedVisible, '메뉴 스냅숏에서 관리자 트리를 세지 못했다').toBeGreaterThan(0);
        expect(visible, '관리자 트리 수가 config/project-composer-menus.json 과 다르다').toHaveLength(expectedVisible);
        expect(visible.filter(node => node.modernRoute === '/admin/security/authority')).toHaveLength(1);
        expect(visible.some(node => node.menuNm === '화면 구성 예제')).toBe(false);
        console.log('>>> useYn Filtering verified via API (menus/head): PASS');
    });
});
