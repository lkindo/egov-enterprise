import { canOpenPage } from '@/lib/auth/page-access';
import type { MenuInfo } from '@/types/foundation/menu';
import { resolveMenuInternalRoute } from './internal-route';

interface MenuAccessSubject {
  permissions?: readonly string[];
  authorizationVersion?: string;
}

/**
 * 메뉴 트리에서 지금 사용자가 **들어갈 수 없는** 메뉴를 걷는다(2026-10-01).
 *
 * 서버의 메뉴 트리는 메뉴 배정(NAVIGATION)만으로 거르고, `/admin` 진입은 기능 권한(OPERATION)으로 막는다
 * (proxy.ts → canEnterRegisteredPage). 권한 그룹이 메뉴는 배정하고 그 화면의 기능 권한은 주지 않으면, 사용자는
 * 사이드바·명령 센터·즐겨찾기에서 그 메뉴를 보지만 누를 때마다 사유 없이 홈으로 되돌려졌다. 화면 안 링크는
 * DEC-OPS-152 가 같은 판정(canOpenPage)으로 맞췄고, 가장 많이 쓰는 길인 메뉴가 빠져 있었다.
 *
 * - 말단 메뉴: 경로를 열 수 없으면 뺀다. 경로가 없는 말단(분류만 있는 항목)은 그대로 둔다.
 * - 하위가 있는 메뉴: 하위를 먼저 거른다. 자기 경로를 열 수 없으면 경로를 떼어 분류로만 남기고,
 *   남은 하위가 없으면 뺀다 — 눌러도 아무 데도 갈 수 없는 분류를 남기지 않는다.
 * - 하위를 아직 불러오지 않은 메뉴(`children` 없음)는 판정할 수 없으므로 그대로 둔다.
 *
 * 권한 상태를 아직 모르면(`authorizationVersion` 없음) 거르지 않는다 — 로딩 중에 메뉴가 사라졌다 나타나지 않게 한다.
 * 노출 판정일 뿐 인가가 아니다. 서버 권한과 라우트 게이트는 그대로 집행된다(H3).
 */
export function openableMenus(menus: readonly MenuInfo[], subject: MenuAccessSubject | null | undefined): MenuInfo[] {
  if (!subject?.authorizationVersion) return [...menus];
  return prune(menus, subject);
}

function prune(menus: readonly MenuInfo[], subject: MenuAccessSubject): MenuInfo[] {
  const kept: MenuInfo[] = [];
  for (const menu of menus) {
    const route = resolveMenuInternalRoute(menu);
    const canOpenOwnRoute = route !== null && canOpenPage(subject, route);

    if (menu.children === undefined) {
      if (route === null || canOpenOwnRoute) kept.push(menu);
      continue;
    }

    // [2026-10-01] 하위를 불러왔는데 비어 있고 연결 주소도 없는 분류는 그리지 않는다 — 누르면 아무 데도 가지 않는
    //   막다른 항목이었다. 주소가 있는데 내부 경로로 해석되지 않는 항목(외부·레거시 주소)은 종전대로 남긴다.
    const emptyCategory = route === null && !menu.modernRoute && !menu.chkURL;

    const hadChildren = menu.children.length > 0;
    const children = prune(menu.children, subject);
    if (!hadChildren) {
      if (!emptyCategory && (route === null || canOpenOwnRoute)) kept.push(menu);
    } else if (canOpenOwnRoute) {
      kept.push(children.length === menu.children.length ? menu : { ...menu, children });
    } else if (children.length > 0) {
      // 자기 경로는 열 수 없지만 열 수 있는 하위가 있다 — 경로를 떼어 분류로만 남긴다.
      kept.push(route === null
        ? (children.length === menu.children.length ? menu : { ...menu, children })
        : { ...menu, modernRoute: undefined, chkURL: undefined, children });
    }
  }
  return kept;
}
