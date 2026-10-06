import { MenuInfo } from '@/types/foundation/menu';

export interface FlattenedItem extends MenuInfo {
  parentId: number | null;
  depth: number;
  index: number;
}

export const flattenTree = (
  items: MenuInfo[],
  parentId: number | null = null,
  depth = 0
): FlattenedItem[] => {
  return items.reduce<FlattenedItem[]>((acc, item, index) => {
    return [
      ...acc,
      { ...item, parentId, depth, index },
      ...flattenTree(item.children || [], item.menuNo, depth + 1),
    ];
  }, []);
};

export const listToTree = (flatMenus: MenuInfo[]): MenuInfo[] => {
  const map: Record<number, MenuInfo> = {};
  const roots: MenuInfo[] = [];

  flatMenus.forEach((m) => {
    if (m && m.menuNo) {
      map[m.menuNo] = { ...m, children: [] };
    }
  });

  flatMenus.forEach((m) => {
    if (!m || !m.menuNo) return;
    const item = map[m.menuNo];
    const parentId = m.upMenuSn ?? m.upperMenuId ?? 0;

    if (parentId === 0 || !map[parentId]) {
      roots.push(item);
    } else {
      const parent = map[parentId];
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(item);
      }
    }
  });

  // 정렬 순서(menuOrdr)에 따라 정렬한다. [2026-10-02] 동순위는 메뉴 번호로 가른다 — 서버 조회는 동순위의 순서를
  //   정하지 않아(ORDER BY 에 tiebreaker 없음) 같은 데이터가 매번 다르게 그려지고, 구조 초안의 기준선도 흔들렸다.
  const sortByOrder = (a: MenuInfo, b: MenuInfo) => (a.menuOrdr || 0) - (b.menuOrdr || 0) || a.menuNo - b.menuNo;
  roots.sort(sortByOrder);
  
  const sortRecursive = (node: MenuInfo) => {
    if (node.children && node.children.length > 0) {
      node.children.sort(sortByOrder);
      node.children.forEach(sortRecursive);
    }
  };
  roots.forEach(sortRecursive);

  return roots;
};

/** 메뉴 계층의 가장 깊은 단계(0부터). 새 메뉴 추가 버튼과 같은 3단계 제한이다. */
export const MAX_MENU_DEPTH = 2;
